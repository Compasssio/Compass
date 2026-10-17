use protobuf_codegen::{Codegen, Customize};
use std::env;

fn main() {
    let generate_proto = env::var("GENERATE_PROTO").unwrap_or_else(|_| "false".to_string());
    if generate_proto == "true" {
        Codegen::new()
            .out_dir("src/cast")
            .inputs([
                "protobuf/authority_keys.proto",
                "protobuf/cast_channel.proto",
            ])
            .includes(["protobuf"])
            .customize(Customize::default().gen_mod_rs(false))
            .run()
            .expect("protoc");
    }

    println!("rerun-if-env-changed=GENERATE_PROTO");
    println!("rerun-if-changed=protobuf/authority_keys.proto");
    println!("rerun-if-changed=protobuf/cast_channel.proto");
}
