# Seguridad de la tienda en Supabase (RLS)

La tienda (`tienda.html`) y el panel (`admin.html`) usan la **anon key** de Supabase. Esa clave es pública
por diseño: cualquiera puede verla en el código. Lo que protege los datos son las **políticas RLS**.
Si RLS está apagado o tiene políticas abiertas, cualquiera con la anon key puede editar o borrar productos.

Con estos pasos queda así:

| Quién | Productos / Config | Imágenes (bucket `productos`) |
|---|---|---|
| Visitante anónimo | Solo leer | Solo ver por URL pública |
| Usuario logueado que **no** es admin | Solo leer | Solo ver |
| Admin (tu email) | Leer, crear, editar, borrar | Subir, reemplazar, borrar |

---

## Paso 1 — Cerrar el registro público

Supabase → **Authentication → Sign In / Providers → Email**
- Dejá **Email** habilitado.
- **Desactivá "Allow new users to sign up"**, así nadie puede crearse una cuenta desde afuera.

## Paso 2 — Crear el usuario admin

Supabase → **Authentication → Users → Add user → Create new user**
- Email: el email de la veterinaria que va a administrar la tienda.
- Contraseña: una nueva y fuerte. **No reutilices la contraseña vieja de edición** (su hash estuvo público en el código).
- Tildá **Auto Confirm User**.

Si querés que entren dos personas, creá un usuario por persona y sumá los dos emails en el paso 3.

## Paso 3 — Ejecutar el SQL

Supabase → **SQL Editor → New query**. Pegá todo el bloque y **reemplazá `ADMIN@EJEMPLO.COM`** por el
email del paso 2. Si son varios, separalos con coma: `('a@gmail.com', 'b@gmail.com')`. Después tocá **Run**.

```sql
-- 0) Ver qué políticas existen hoy (solo informativo)
select schemaname, tablename, policyname, cmd, roles
from pg_policies
where (schemaname = 'public' and tablename in ('Productos', 'Config'))
   or (schemaname = 'storage' and tablename = 'objects');

-- 1) Función que dice si el usuario logueado es admin
create or replace function public.is_firvet_admin()
returns boolean
language sql
stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    lower('ADMIN@EJEMPLO.COM')        -- <<< REEMPLAZAR
  );
$$;

-- 2) Activar RLS
alter table public."Productos" enable row level security;
alter table public."Config"    enable row level security;

-- 3) Borrar las políticas viejas de esas dos tablas (pueden ser abiertas)
do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('Productos', 'Config')
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

-- 4) Productos: lectura pública, escritura solo admin
create policy "productos_select_publico" on public."Productos"
  for select to anon, authenticated using (true);
create policy "productos_insert_admin" on public."Productos"
  for insert to authenticated with check (public.is_firvet_admin());
create policy "productos_update_admin" on public."Productos"
  for update to authenticated using (public.is_firvet_admin()) with check (public.is_firvet_admin());
create policy "productos_delete_admin" on public."Productos"
  for delete to authenticated using (public.is_firvet_admin());

-- 5) Config (precio de envío): lectura pública, escritura solo admin
create policy "config_select_publico" on public."Config"
  for select to anon, authenticated using (true);
create policy "config_insert_admin" on public."Config"
  for insert to authenticated with check (public.is_firvet_admin());
create policy "config_update_admin" on public."Config"
  for update to authenticated using (public.is_firvet_admin()) with check (public.is_firvet_admin());

-- 6) Storage, bucket "productos"
--    Borrar políticas previas que mencionen el bucket "productos"
do $$
declare r record;
begin
  for r in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and (coalesce(qual, '') ilike '%productos%' or coalesce(with_check, '') ilike '%productos%')
  loop
    execute format('drop policy %I on storage.objects', r.policyname);
  end loop;
end $$;

create policy "productos_storage_insert_admin" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'productos' and public.is_firvet_admin());
create policy "productos_storage_update_admin" on storage.objects
  for update to authenticated
  using (bucket_id = 'productos' and public.is_firvet_admin())
  with check (bucket_id = 'productos' and public.is_firvet_admin());
create policy "productos_storage_delete_admin" on storage.objects
  for delete to authenticated
  using (bucket_id = 'productos' and public.is_firvet_admin());
-- No hace falta una política SELECT: si el bucket es "Public", las imágenes se ven igual por su URL
-- pública, y así nadie puede listar todos los archivos.
```

## Paso 4 — Bucket público

Supabase → **Storage → productos → Edit bucket** → dejá **Public bucket** activado (para que la tienda
muestre las imágenes). Opcional: en "Allowed MIME types" poné `image/*` y límite de 5 MB.

## Paso 5 — (Opcional) Columna para talle / peso

El panel muestra el campo "Talle / peso" solo si existe esta columna:

```sql
alter table public."Productos" add column if not exists "Presentacion" text;
```

---

## Cómo comprobar que funciona

### A. Desde la terminal (curl)

Reemplazá `ANON` por la anon key (está en `tienda.html`, constante `SUPABASE_ANON_KEY`).

```bash
URL=https://lkoqygvxvyvyvmfoqaje.supabase.co/rest/v1
ANON=eyJ...   # anon key

# 1) Leer: tiene que devolver los productos (200)
curl -s "$URL/Productos?select=id,Nombre&limit=3" -H "apikey: $ANON" -H "Authorization: Bearer $ANON"

# 2) Insertar como anónimo: tiene que FALLAR con 401/403 y "new row violates row-level security policy"
curl -s -X POST "$URL/Productos" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"Nombre":"PRUEBA RLS"}'

# 3) Editar como anónimo: tiene que devolver []  (0 filas afectadas)
curl -s -X PATCH "$URL/Productos?id=gt.0" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d '{"Nombre":"HACKEADO"}'

# 4) Borrar como anónimo: tiene que devolver []  (no borra nada)
curl -s -X DELETE "$URL/Productos?id=eq.-1" -H "apikey: $ANON" -H "Authorization: Bearer $ANON" \
  -H "Prefer: return=representation"
```

> Ojo: con RLS, un UPDATE o DELETE sin permiso **no da error**. Simplemente afecta 0 filas y devuelve `[]`.
> Si el paso 3 devuelve productos con el nombre cambiado, RLS **no** está funcionando.
> En ese caso entrá al panel y corregí los nombres.

### B. Desde el navegador

1. Abrí `tienda.html` y comprobá que los productos se ven.
2. Abrí `admin.html` en una ventana de incógnito **sin loguearte** → solo tiene que aparecer el login.
3. Logueate con el usuario admin → editá un producto y guardá → tiene que decir "Guardado".
4. (Opcional) Creá un segundo usuario que **no** esté en la función `is_firvet_admin` y logueate con él:
   al guardar tiene que decir "Sin permiso para editar".

### C. En el panel de Supabase

**Authentication → Policies**: `Productos` y `Config` tienen que mostrar "RLS enabled" y solo las políticas
creadas arriba.
