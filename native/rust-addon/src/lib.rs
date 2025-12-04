use napi::bindgen_prelude::*;
use napi_derive::napi;
use sha2::{Digest, Sha256};

#[napi]
pub fn hash_sha256(input: String) -> String {
  let mut hasher = Sha256::new();
  hasher.update(input.as_bytes());
  let result = hasher.finalize();
  hex::encode(result)
}
