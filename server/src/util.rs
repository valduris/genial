use std::fs::OpenOptions;
use actix_web::HttpResponse;
use sqlx::Error;
use std::io::Write;
use sqlx::postgres::PgQueryResult;

pub fn print_type_of<T>(_: &T) {
    println!("{}", std::any::type_name::<T>())
}

pub fn handle_postgres_query_result(result: Result<PgQueryResult, Error>) -> HttpResponse {
    match result {
        Ok(_) => {
            return HttpResponse::Ok().json(serde_json::json!({ "status": "success" }));
        }
        Err(e) => {
            return HttpResponse::InternalServerError().json(serde_json::json!({ "status": "error","message": format!("{:?}", e)}));
        }
    }
}

pub fn error_log(s: String) {
    let mut file = OpenOptions::new().create_new(true).write(true).append(true).open("../error.log").unwrap();

    if let Err(e) = writeln!(file, "{}", s) {
        eprintln!("Couldn't write to file: {}", e);
    }
}