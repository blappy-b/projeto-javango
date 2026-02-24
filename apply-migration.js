/**
 * Script para aplicar migration manualmente via Supabase Admin Client
 * 
 * Execute este script com: node apply-migration.js
 * 
 * IMPORTANTE: Configure as variáveis de ambiente antes de executar:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error("❌ Variáveis de ambiente faltando!");
    console.error("Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Lê o arquivo de migration
  const migrationPath = path.join(
    __dirname,
    "supabase",
    "migrations",
    "20260223000000_add_order_id_to_tickets.sql"
  );

  console.log("📖 Lendo migration:", migrationPath);
  const sql = fs.readFileSync(migrationPath, "utf8");

  console.log("🔧 Aplicando migration...");
  console.log(sql);
  console.log("");

  // Divide o SQL em statements individuais e executa
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  for (const statement of statements) {
    console.log("⚙️  Executando:", statement.substring(0, 50) + "...");
    const { error } = await supabase.rpc("exec_sql", { sql_query: statement });

    if (error) {
      // Se não houver a função exec_sql, tenta executar diretamente
      console.log("⚠️  Método 1 falhou, tentando método alternativo...");
      
      // Método alternativo: usa from() com .insert()
      // Mas para DDL, precisamos usar approach diferente
      console.error("❌ Erro ao executar statement:", error);
      console.error("Statement:", statement);
      console.error("\n⚠️  SOLUÇÃO ALTERNATIVA:");
      console.error("Execute manualmente no SQL Editor do Supabase Dashboard:");
      console.error("https://app.supabase.com/project/_/sql/new");
      console.error("\nCole este SQL:");
      console.error("\n" + sql);
      process.exit(1);
    }
  }

  console.log("✅ Migration aplicada com sucesso!");
}

applyMigration().catch((error) => {
  console.error("❌ Erro ao aplicar migration:", error);
  process.exit(1);
});
