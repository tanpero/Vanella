use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::{Digest, Sha256};
use rusqlite::{Connection, Statement};
use rusqlite::types::{Value as SqlValue, ValueRef as SqlValueRef};
use serde_json::{Value as JsonValue, Map as JsonMap};
use std::fs;
use std::path::Path;
use base64::{engine::general_purpose, Engine as _};

#[napi]
pub fn hash_sha256(input: String) -> String {
  let mut hasher = Sha256::new();
  hasher.update(input.as_bytes());
  let result = hasher.finalize();
  hex::encode(result)
}

fn open_conn(db_path: &str) -> Result<Connection> {
  let conn = Connection::open(db_path)
    .map_err(|e| Error::from_reason(format!("open db failed: {}", e)))?;
  conn
    .execute_batch(
      "PRAGMA journal_mode=WAL;\nPRAGMA foreign_keys=ON;\nPRAGMA synchronous=NORMAL;",
    )
    .map_err(|e| Error::from_reason(format!("init pragmas failed: {}", e)))?;
  Ok(conn)
}

fn parse_params(params_json: Option<String>) -> Result<Vec<SqlValue>> {
  let mut out: Vec<SqlValue> = Vec::new();
  if let Some(s) = params_json {
    let v: JsonValue = serde_json::from_str(&s)
      .map_err(|e| Error::from_reason(format!("invalid params json: {}", e)))?;
    match v {
      JsonValue::Array(arr) => {
        for item in arr {
          match item {
            JsonValue::Null => out.push(SqlValue::Null),
            JsonValue::Bool(b) => out.push(SqlValue::Integer(if b { 1 } else { 0 })),
            JsonValue::Number(n) => {
              if let Some(i) = n.as_i64() {
                out.push(SqlValue::Integer(i))
              } else if let Some(f) = n.as_f64() {
                out.push(SqlValue::Real(f))
              } else {
                return Err(Error::from_reason("unsupported number type"));
              }
            }
            JsonValue::String(s) => {
              if let Some(rest) = s.strip_prefix("base64:") {
                let decoded = general_purpose::STANDARD
                  .decode(rest)
                  .map_err(|e| Error::from_reason(format!("invalid base64 blob: {}", e)))?;
                out.push(SqlValue::Blob(decoded))
              } else {
                out.push(SqlValue::Text(s))
              }
            }
            _ => return Err(Error::from_reason("object/array not supported in params")),
          }
        }
      }
      _ => return Err(Error::from_reason("params must be a JSON array")),
    }
  }
  Ok(out)
}

fn bind_params<'a>(stmt: &mut Statement<'a>, params: &[SqlValue]) -> Result<()> {
  // rusqlite doesn't accept Vec<Value> directly; we pass references
  let refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
  stmt
    .execute(rusqlite::params_from_iter(refs))
    .map_err(|e| Error::from_reason(format!("execute failed: {}", e)))?;
  Ok(())
}

fn row_to_json(row: &rusqlite::Row<'_>, col_names: &[String]) -> Result<JsonValue> {
  let mut obj = JsonMap::new();
  let col_count = col_names.len();
  for i in 0..col_count {
    let name = &col_names[i];
    let vref = row.get_ref(i).map_err(|e| Error::from_reason(format!("read column failed: {}", e)))?;
    let jv = match vref {
      SqlValueRef::Null => JsonValue::Null,
      SqlValueRef::Integer(i) => JsonValue::from(i),
      SqlValueRef::Real(f) => JsonValue::from(f),
      SqlValueRef::Text(t) => JsonValue::from(String::from_utf8_lossy(t).to_string()),
      SqlValueRef::Blob(b) => {
        let s = format!("base64:{}", general_purpose::STANDARD.encode(b));
        JsonValue::from(s)
      }
    };
    obj.insert(name.clone(), jv);
  }
  Ok(JsonValue::Object(obj))
}

#[napi]
pub fn db_init(db_path: String) -> Result<bool> {
  if let Some(dir) = Path::new(&db_path).parent() {
    if !dir.exists() {
      fs::create_dir_all(dir).map_err(|e| Error::from_reason(format!("create dir failed: {}", e)))?;
    }
  }
  let _ = open_conn(&db_path)?;
  Ok(true)
}

#[napi]
pub fn db_execute(db_path: String, sql: String, params_json: Option<String>) -> Result<i64> {
  let conn = open_conn(&db_path)?;
  let params = parse_params(params_json)?;
  if params.is_empty() {
    let changes = conn
      .execute(&sql, [])
      .map_err(|e| Error::from_reason(format!("execute failed: {}", e)))? as i64;
    Ok(changes)
  } else {
    let mut stmt = conn
      .prepare(&sql)
      .map_err(|e| Error::from_reason(format!("prepare failed: {}", e)))?;
    let refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
    let changes = stmt
      .execute(rusqlite::params_from_iter(refs))
      .map_err(|e| Error::from_reason(format!("execute failed: {}", e)))? as i64;
    Ok(changes)
  }
}

#[napi]
pub fn db_query(db_path: String, sql: String, params_json: Option<String>) -> Result<String> {
  let conn = open_conn(&db_path)?;
  let params = parse_params(params_json)?;
  let mut stmt = conn
    .prepare(&sql)
    .map_err(|e| Error::from_reason(format!("prepare failed: {}", e)))?;
  let refs: Vec<&dyn rusqlite::ToSql> = params.iter().map(|v| v as &dyn rusqlite::ToSql).collect();
  let col_count = stmt.column_count();
  let mut col_names: Vec<String> = Vec::with_capacity(col_count);
  for i in 0..col_count {
    let name = match stmt.column_name(i) {
      Ok(s) => s.to_string(),
      Err(_) => format!("col_{}", i),
    };
    col_names.push(name);
  }
  let mut rows = stmt
    .query(rusqlite::params_from_iter(refs))
    .map_err(|e| Error::from_reason(format!("query failed: {}", e)))?;
  let mut out: Vec<JsonValue> = Vec::new();
  while let Some(row) = rows.next().map_err(|e| Error::from_reason(format!("next row failed: {}", e)))? {
    let jv = row_to_json(&row, &col_names)?;
    out.push(jv);
  }
  serde_json::to_string(&out)
    .map_err(|e| Error::from_reason(format!("serialize rows failed: {}", e)))
}

#[napi]
pub fn db_migrate(db_path: String, migrations: Vec<String>) -> Result<bool> {
  let mut conn = open_conn(&db_path)?;
  let tx = conn
    .transaction()
    .map_err(|e| Error::from_reason(format!("begin transaction failed: {}", e)))?;
  for m in migrations {
    tx
      .execute_batch(&m)
      .map_err(|e| Error::from_reason(format!("migration failed: {}", e)))?;
  }
  tx.commit()
    .map_err(|e| Error::from_reason(format!("commit failed: {}", e)))?;
  Ok(true)
}

#[napi]
pub fn db_vacuum(db_path: String) -> Result<bool> {
  let conn = open_conn(&db_path)?;
  conn
    .execute_batch("VACUUM")
    .map_err(|e| Error::from_reason(format!("vacuum failed: {}", e)))?;
  Ok(true)
}

#[napi]
pub fn db_backup(db_path: String, backup_path: String) -> Result<bool> {
  fs::copy(&db_path, &backup_path)
    .map_err(|e| Error::from_reason(format!("backup failed: {}", e)))?;
  Ok(true)
}
