    -- Actualizar columna area de TEXT a TEXT[] (array) para permitir múltiples áreas
    -- Ejecuta este script en el SQL Editor de Supabase

    -- 1. Eliminar constraint anterior si existe
    DO $$ 
    BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'people_area_check'
    ) THEN
        ALTER TABLE people DROP CONSTRAINT people_area_check;
    END IF;
    END $$;

    -- 2. Cambiar el tipo de columna a TEXT[] con conversión explícita
    ALTER TABLE people
    ALTER COLUMN area TYPE TEXT[] USING 
    CASE 
        WHEN area IS NULL THEN NULL
        WHEN area = '' THEN NULL
        ELSE ARRAY[area]::TEXT[]
    END;

    -- 2.1. Actualizar registros existentes: convertir "JEFES" a "JEFE" en arrays
    UPDATE people
    SET area = (
        SELECT array_agg(
            CASE 
                WHEN area_item = 'JEFES' THEN 'JEFE'
                ELSE area_item
            END
        )
        FROM unnest(area) AS area_item
    )
    WHERE area IS NOT NULL AND 'JEFES' = ANY(area);

    -- 3. Crear función para validar que todos los valores del array estén en la lista permitida
    CREATE OR REPLACE FUNCTION validate_area_array(area_arr TEXT[])
    RETURNS BOOLEAN AS $$
    BEGIN
        -- Si es NULL, es válido
        IF area_arr IS NULL THEN
            RETURN TRUE;
        END IF;
        
        -- Si está vacío, es válido
        IF array_length(area_arr, 1) IS NULL THEN
            RETURN TRUE;
        END IF;
        
        -- Verificar que todos los elementos estén en la lista permitida
        RETURN (
            SELECT bool_and(area_item IN ('RRHH', 'Calidad', 'Sistemas', 'Marketing', 'Compras', 'Administracion', 'Mantenimiento', 'Logistica', 'Fabrica', 'JEFE'))
            FROM unnest(area_arr) AS area_item
        );
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    -- 4. Crear constraint usando la función de validación
    DO $$ 
    BEGIN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'people_area_check'
        ) THEN
            ALTER TABLE people
            ADD CONSTRAINT people_area_check 
            CHECK (validate_area_array(area));
        END IF;
    END $$;

    -- 5. Crear función para verificar si un array contiene un valor específico (útil para búsquedas)
    CREATE OR REPLACE FUNCTION array_contains(arr TEXT[], val TEXT)
    RETURNS BOOLEAN AS $$
    BEGIN
        RETURN val = ANY(arr);
    END;
    $$ LANGUAGE plpgsql IMMUTABLE;

    -- 6. Verificar que la columna se actualizó correctamente
    SELECT 
    column_name, 
    data_type,
    udt_name,
    is_nullable,
    column_default
    FROM information_schema.columns
    WHERE table_name = 'people' 
    AND column_name = 'area';

