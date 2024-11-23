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

pub fn get_random_name() -> String {
    String::from(NAMES[(rand::random::<f32>() * NAMES.len() as f32).floor() as usize])
}

const NAMES: &[&str] = &[
    "čurbuls",
    "kanķiks",
    "antoņins",
    "oksana",
    "leokādijs",
    "azerbumbuls",
    "kazačoks",
    "aija",
    "kunkstis",
    "vaidis",
    "stenis",
    "elsis",
    "purdainis",
    "akjels",
    "čomiņš",
    "pēcis",
    "aņņuls",
    "kaskokāpēcis",
    "čunguls",
    "ērmuks",
    "fanta",
    "bute",
    "mopsis",
    "ērkuls",
    "čolītājs",
    "desa",
    "renģīte",
    "ņaudīte",
    "emsis",
    "koferis",
    "tosteris",
    "sviestmaize",
    "šķiltava",
    "sērkoks",
    "iemauktiņa",
    "sidrabiņa",
    "varis",
    "jokbambis",
    "ēriks",
    "anvars",
    "gunvaldis",
    "kija",
    "stikla desa",
    "vienreizējs",
    "seksī zaceps",
    "jēzus",
    "svētais gals",
    "ķinķēziņš",
    "grietiņa",
    "vējonis",
    "rāpulis",
    "murmulīte",
    "žāva",
    "urķis",
    "plaudis",
    "pļurkšķis",
    "murrā kā rukšķis",
];