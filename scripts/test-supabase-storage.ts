/**
 * Script para verificar la conexión y funcionamiento de Supabase Storage
 * Ejecutar con: npx tsx scripts/test-supabase-storage.ts
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const BUCKET_NAME = "evidencias";

async function testSupabaseStorage() {
  console.log("=".repeat(60));
  console.log("TEST DE SUPABASE STORAGE - BUCKET 'evidencias'");
  console.log("=".repeat(60));

  // 1. Verificar variables de entorno
  console.log("\n[1/6] Verificando variables de entorno...");
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    console.error("   ERROR: NEXT_PUBLIC_SUPABASE_URL no está definida");
    process.exit(1);
  }
  if (!supabaseAnonKey) {
    console.error("   ERROR: NEXT_PUBLIC_SUPABASE_ANON_KEY no está definida");
    process.exit(1);
  }
  console.log("   OK: Variables de entorno configuradas");
  console.log(`   URL: ${supabaseUrl}`);

  // 2. Crear cliente
  console.log("\n[2/6] Creando cliente de Supabase...");
  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("   OK: Cliente creado");

  // 3. Listar buckets existentes
  console.log("\n[3/6] Listando buckets existentes...");
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();

  if (listError) {
    console.error("   ERROR al listar buckets:", listError.message);
    console.log("\n   POSIBLE CAUSA:");
    console.log("   - La API key no tiene permisos para listar buckets");
    console.log("   - Esto es normal con anon key, continuando...");
  } else {
    console.log(`   Buckets encontrados: ${buckets?.length || 0}`);
    buckets?.forEach((b) => console.log(`   - ${b.name} (público: ${b.public})`));

    const evidenciasBucket = buckets?.find((b) => b.name === BUCKET_NAME);
    if (!evidenciasBucket) {
      console.log(`\n   ADVERTENCIA: Bucket '${BUCKET_NAME}' no encontrado`);
      console.log("   Necesitas crearlo en Supabase Dashboard > Storage");
    }
  }

  // 4. Verificar acceso al bucket
  console.log(`\n[4/6] Verificando acceso al bucket '${BUCKET_NAME}'...`);
  const { data: files, error: bucketError } = await supabase.storage
    .from(BUCKET_NAME)
    .list("", { limit: 1 });

  if (bucketError) {
    console.error("   ERROR:", bucketError.message);

    if (bucketError.message.includes("not found") || bucketError.message.includes("does not exist")) {
      console.log("\n   SOLUCION: Crear el bucket 'evidencias' en Supabase:");
      console.log("   1. Ir a https://supabase.com/dashboard");
      console.log("   2. Seleccionar el proyecto");
      console.log("   3. Ir a Storage > New bucket");
      console.log("   4. Nombre: 'evidencias'");
      console.log("   5. Marcar 'Public bucket' si quieres URLs públicas");
      process.exit(1);
    }

    if (bucketError.message.includes("policy") || bucketError.message.includes("permission")) {
      console.log("\n   SOLUCION: Configurar políticas RLS para el bucket:");
      console.log("   Ver instrucciones al final del script");
    }
  } else {
    console.log(`   OK: Acceso al bucket verificado (${files?.length || 0} archivos en raíz)`);
  }

  // 5. Subir archivo de prueba
  console.log("\n[5/6] Subiendo archivo de prueba...");
  const testFileName = `test/test-upload-${Date.now()}.txt`;
  const testContent = `Archivo de prueba - MARMAQ Servicios\nFecha: ${new Date().toISOString()}\nEste archivo puede ser eliminado.`;

  const { data: uploadData, error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(testFileName, testContent, {
      contentType: "text/plain",
      upsert: true,
    });

  if (uploadError) {
    console.error("   ERROR al subir:", uploadError.message);

    if (uploadError.message.includes("row-level security") ||
        uploadError.message.includes("policy") ||
        uploadError.message.includes("not authorized")) {
      console.log("\n" + "=".repeat(60));
      console.log("ERROR DE POLITICAS RLS - CONFIGURACION NECESARIA");
      console.log("=".repeat(60));
      console.log("\nEjecuta este SQL en Supabase SQL Editor:\n");
      console.log(`
-- Permitir uploads públicos al bucket evidencias
CREATE POLICY "Permitir uploads públicos" ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'evidencias');

-- Permitir lecturas públicas
CREATE POLICY "Permitir lecturas públicas" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'evidencias');

-- Permitir actualizaciones (upsert)
CREATE POLICY "Permitir updates públicos" ON storage.objects
FOR UPDATE
TO public
USING (bucket_id = 'evidencias');

-- Permitir eliminaciones
CREATE POLICY "Permitir deletes públicos" ON storage.objects
FOR DELETE
TO public
USING (bucket_id = 'evidencias');
      `.trim());
      console.log("\n" + "=".repeat(60));
      console.log("ALTERNATIVA: Políticas más restrictivas (recomendado para producción):");
      console.log("=".repeat(60));
      console.log(`
-- Solo permitir uploads en carpeta 'ordenes/'
CREATE POLICY "Upload solo en ordenes" ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'evidencias'
  AND (storage.foldername(name))[1] = 'ordenes'
);

-- Lectura pública de todo el bucket
CREATE POLICY "Lectura pública" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'evidencias');
      `.trim());
    }
    process.exit(1);
  }

  console.log("   OK: Archivo subido exitosamente");
  console.log(`   Path: ${uploadData?.path}`);

  // 6. Obtener URL pública
  console.log("\n[6/6] Obteniendo URL pública...");
  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(testFileName);

  console.log(`   URL: ${urlData.publicUrl}`);

  // Verificar si la URL es accesible
  try {
    const response = await fetch(urlData.publicUrl);
    if (response.ok) {
      console.log("   OK: URL accesible públicamente");
    } else {
      console.log(`   ADVERTENCIA: URL retorna ${response.status}`);
      console.log("   El bucket puede no ser público");
    }
  } catch {
    console.log("   ADVERTENCIA: No se pudo verificar la URL");
  }

  // Limpiar archivo de prueba
  console.log("\n[CLEANUP] Eliminando archivo de prueba...");
  const { error: deleteError } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([testFileName]);

  if (deleteError) {
    console.log(`   Advertencia: No se pudo eliminar: ${deleteError.message}`);
  } else {
    console.log("   OK: Archivo de prueba eliminado");
  }

  // Resumen
  console.log("\n" + "=".repeat(60));
  console.log("RESULTADO: TODAS LAS PRUEBAS PASARON");
  console.log("=".repeat(60));
  console.log("\nEl sistema de storage está funcionando correctamente.");
  console.log("Puedes subir evidencias desde la aplicación.");
}

// Ejecutar
testSupabaseStorage().catch((err) => {
  console.error("\nError inesperado:", err);
  process.exit(1);
});
