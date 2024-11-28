// https://stackoverflow.com/questions/27673674/is-there-a-way-to-create-a-data-type-that-only-accepts-a-range-of-values

// rand::thread_rng().gen_range(0..3 as u8)

// let Ok((id,)): Result<(i32,), Error> = sqlx::query_as(r#"INSERT INTO player (uuid, game_uuid) VALUES ($1, $2) ON CONFLICT (uuid) DO UPDATE SET game_uuid = $2 RETURNING id"#)
//     .bind(body.playerUuid.clone())
//     .bind(body.gameUuid.clone())
//     .fetch_one(&data.postgres_pool)
//     .await else { todo!() };

// api_get_lobby_game
// let rows: Vec<ApiLobbyGame> = sqlx::query_as(r#"
//     select json_build_object(uuid, players) as game
//     from (
//         select g.uuid as uuid, array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) players
//         from game g
//         join player p on g.uuid = p.game_uuid
//         where g.uuid = $1
//         group by g.uuid
//     ) players;
// "#).bind(body.gameUuid.clone()).fetch_all(&state.postgres_pool).await.unwrap();

// api_get_games
// let query = r#"
//     SELECT
//         g.name, g.uuid, g.board_size AS "boardSize", g.player_count AS "playerCount", g.status,
//         g.show_progress AS "showProgress", COALESCE(
//             array_agg(json_build_object('ready', p.ready, 'id', p.id, 'name', p.name)) FILTER (WHERE p.id IS NOT NULL), '{}'
//         ) players
//     FROM game g
//     LEFT JOIN player p ON g.uuid = p.game_uuid
//     GROUP BY g.id;
// "#;
// let rows: Vec<ApiGame> = sqlx::query_as(query).fetch_all(&state.postgres_pool).await.unwrap();

// tokio RwLock
// let tasks = game.players.iter().map(|uuid| tokio::spawn(async move {
//     let player = players.get(&uuid).unwrap().read();
//     ApiLobbyGamePlayer {
//         ready: player.ready,
//         id: player.id,
//         name: player.name.clone(),
//     }
// })).collect::<FuturesUnordered<_>>();
//
// let players: Vec<_> = futures::future::join_all(tasks).await.iter().filter(|r| {
//     r.is_ok()
// }).map(|r| {
//     r.unwrap()
// }).collect();
// .iter().map(|r| {
// Ok(r);
// }).collect();