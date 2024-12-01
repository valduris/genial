--
-- PostgreSQL database dump
--

-- Dumped from database version 14.5
-- Dumped by pg_dump version 14.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

SELECT pg_catalog.set_config('search_path', 'public', false);
-- grant usage on schema public to public;

--
-- Name: _sqlx_migrations; Type: TABLE; Schema: public; Owner: genial
--

CREATE TABLE _sqlx_migrations (
    version bigint NOT NULL,
    description text NOT NULL,
    installed_on timestamp with time zone DEFAULT now() NOT NULL,
    success boolean NOT NULL,
    checksum bytea NOT NULL,
    execution_time bigint NOT NULL
);


ALTER TABLE _sqlx_migrations OWNER TO genial;

--
-- Name: game; Type: TABLE; Schema: public; Owner: genial
--

CREATE TABLE game (
    id integer NOT NULL,
    uuid text NOT NULL,
    created_at timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp(3) without time zone DEFAULT now() NOT NULL,
    board_size integer DEFAULT 6 NOT NULL,
    player_count integer DEFAULT 2 NOT NULL,
    hexy_pairs jsonb DEFAULT '[]'::jsonb NOT NULL,
    name character varying(255) NOT NULL,
    public boolean DEFAULT false NOT NULL,
    status text DEFAULT 'created' NOT NULL,
    show_progress boolean DEFAULT true NOT NULL,
    admin_uuid text
);


ALTER TABLE game OWNER TO genial;

--
-- Name: game_id_seq; Type: SEQUENCE; Schema: public; Owner: genial
--

CREATE SEQUENCE game_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE game_id_seq OWNER TO genial;

--
-- Name: game_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: genial
--

ALTER SEQUENCE game_id_seq OWNED BY game.id;


--
-- Name: player; Type: TABLE; Schema: public; Owner: genial
--

CREATE TABLE "player" (
    id integer NOT NULL,
    uuid text NOT NULL,
    email text,
    game_id integer,
    name text,
    progress jsonb DEFAULT '[]'::jsonb NOT NULL,
    password text,
    ready boolean DEFAULT false
);


ALTER TABLE "player" OWNER TO genial;

--
-- Name: player_id_seq; Type: SEQUENCE; Schema: public; Owner: genial
--

CREATE SEQUENCE player_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE player_id_seq OWNER TO genial;

--
-- Name: player_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: genial
--

ALTER SEQUENCE player_id_seq OWNED BY "player".id;


--
-- Name: game id; Type: DEFAULT; Schema: public; Owner: genial
--

ALTER TABLE ONLY game ALTER COLUMN id SET DEFAULT nextval('game_id_seq'::regclass);


--
-- Name: player id; Type: DEFAULT; Schema: public; Owner: genial
--

ALTER TABLE ONLY "player" ALTER COLUMN id SET DEFAULT nextval('player_id_seq'::regclass);


--
-- Name: _sqlx_migrations _sqlx_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: genial
--

ALTER TABLE ONLY _sqlx_migrations
    ADD CONSTRAINT _sqlx_migrations_pkey PRIMARY KEY (version);


--
-- Name: game game_pkey; Type: CONSTRAINT; Schema: public; Owner: genial
--

ALTER TABLE ONLY game
    ADD CONSTRAINT game_pkey PRIMARY KEY (id);


--
-- Name: player player_pkey; Type: CONSTRAINT; Schema: public; Owner: genial
--

ALTER TABLE ONLY "player"
    ADD CONSTRAINT player_pkey PRIMARY KEY (id);


--
-- Name: game_uuid_key; Type: INDEX; Schema: public; Owner: genial
--

CREATE UNIQUE INDEX game_uuid_key ON game USING btree (uuid);


--
-- Name: player_email_key; Type: INDEX; Schema: public; Owner: genial
--

CREATE UNIQUE INDEX player_email_key ON "player" USING btree (email);


--
-- Name: player_uuid_key; Type: INDEX; Schema: public; Owner: genial
--

CREATE UNIQUE INDEX player_uuid_key ON "player" USING btree (uuid);


--
-- Name: player player_game_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: genial
--

ALTER TABLE ONLY "player"
    ADD CONSTRAINT player_game_id_fkey FOREIGN KEY ("game_id") REFERENCES game(id) ON UPDATE CASCADE ON DELETE SET NULL;


alter table game alter column status type text;

--
-- PostgreSQL database dump complete
--
alter table player add column game_uuid text;

ALTER TABLE ONLY "player"
    ADD CONSTRAINT player_game_uuid_fkey FOREIGN KEY ("game_uuid") REFERENCES game(uuid) ON UPDATE CASCADE ON DELETE SET NULL;

alter table player alter column name set not null;
