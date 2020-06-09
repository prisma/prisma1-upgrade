--
-- PostgreSQL database dump
--

-- Dumped from database version 10.3 (Debian 10.3-1.pgdg90+1)
-- Dumped by pg_dump version 11.5

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

--
-- Name: management; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA management;


ALTER SCHEMA management OWNER TO root;

--
-- Name: postgres-table-1-to-1$dev; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA "postgres-table-1-to-1$dev";


ALTER SCHEMA "postgres-table-1-to-1$dev" OWNER TO root;

SET default_tablespace = '';

SET default_with_oids = false;

--
-- Name: CloudSecret; Type: TABLE; Schema: management; Owner: root
--

CREATE TABLE management."CloudSecret" (
    secret character varying(255) NOT NULL
);


ALTER TABLE management."CloudSecret" OWNER TO root;

--
-- Name: InternalMigration; Type: TABLE; Schema: management; Owner: root
--

CREATE TABLE management."InternalMigration" (
    id character varying(255) NOT NULL,
    "appliedAt" timestamp without time zone NOT NULL
);


ALTER TABLE management."InternalMigration" OWNER TO root;

--
-- Name: Migration; Type: TABLE; Schema: management; Owner: root
--

CREATE TABLE management."Migration" (
    "projectId" character varying(200) DEFAULT ''::character varying NOT NULL,
    revision integer DEFAULT 1 NOT NULL,
    schema text,
    functions text,
    status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    applied integer DEFAULT 0 NOT NULL,
    "rolledBack" integer DEFAULT 0 NOT NULL,
    steps text,
    errors text,
    "startedAt" timestamp without time zone,
    "finishedAt" timestamp without time zone,
    datamodel text,
    CONSTRAINT "Migration_status_check" CHECK (((status)::text = ANY ((ARRAY['PENDING'::character varying, 'IN_PROGRESS'::character varying, 'SUCCESS'::character varying, 'ROLLING_BACK'::character varying, 'ROLLBACK_SUCCESS'::character varying, 'ROLLBACK_FAILURE'::character varying])::text[])))
);


ALTER TABLE management."Migration" OWNER TO root;

--
-- Name: Project; Type: TABLE; Schema: management; Owner: root
--

CREATE TABLE management."Project" (
    id character varying(200) DEFAULT ''::character varying NOT NULL,
    secrets text,
    "allowQueries" boolean DEFAULT true NOT NULL,
    "allowMutations" boolean DEFAULT true NOT NULL,
    functions text
);


ALTER TABLE management."Project" OWNER TO root;

--
-- Name: TelemetryInfo; Type: TABLE; Schema: management; Owner: root
--

CREATE TABLE management."TelemetryInfo" (
    id character varying(255) NOT NULL,
    "lastPinged" timestamp without time zone
);


ALTER TABLE management."TelemetryInfo" OWNER TO root;

--
-- Name: Settings; Type: TABLE; Schema: postgres-table-1-to-1$dev; Owner: root
--

CREATE TABLE "postgres-table-1-to-1$dev"."Settings" (
    id character varying(25) NOT NULL,
    "user" character varying(25)
);


ALTER TABLE "postgres-table-1-to-1$dev"."Settings" OWNER TO root;

--
-- Name: User; Type: TABLE; Schema: postgres-table-1-to-1$dev; Owner: root
--

CREATE TABLE "postgres-table-1-to-1$dev"."User" (
    id character varying(25) NOT NULL
);


ALTER TABLE "postgres-table-1-to-1$dev"."User" OWNER TO root;

--
-- Name: _Settings; Type: TABLE; Schema: postgres-table-1-to-1$dev; Owner: root
--

CREATE TABLE "postgres-table-1-to-1$dev"."_Settings" (
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres-table-1-to-1$dev"."_Settings" OWNER TO root;

--
-- Name: CloudSecret CloudSecret_pkey; Type: CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."CloudSecret"
    ADD CONSTRAINT "CloudSecret_pkey" PRIMARY KEY (secret);


--
-- Name: InternalMigration InternalMigration_pkey; Type: CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."InternalMigration"
    ADD CONSTRAINT "InternalMigration_pkey" PRIMARY KEY (id);


--
-- Name: Migration Migration_pkey; Type: CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."Migration"
    ADD CONSTRAINT "Migration_pkey" PRIMARY KEY ("projectId", revision);


--
-- Name: Project Project_pkey; Type: CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."Project"
    ADD CONSTRAINT "Project_pkey" PRIMARY KEY (id);


--
-- Name: TelemetryInfo TelemetryInfo_pkey; Type: CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."TelemetryInfo"
    ADD CONSTRAINT "TelemetryInfo_pkey" PRIMARY KEY (id);


--
-- Name: Settings Settings_pkey; Type: CONSTRAINT; Schema: postgres-table-1-to-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-table-1-to-1$dev"."Settings"
    ADD CONSTRAINT "Settings_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: postgres-table-1-to-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-table-1-to-1$dev"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _Settings_AB_unique; Type: INDEX; Schema: postgres-table-1-to-1$dev; Owner: root
--

CREATE UNIQUE INDEX "_Settings_AB_unique" ON "postgres-table-1-to-1$dev"."_Settings" USING btree ("A", "B");


--
-- Name: _Settings_B; Type: INDEX; Schema: postgres-table-1-to-1$dev; Owner: root
--

CREATE INDEX "_Settings_B" ON "postgres-table-1-to-1$dev"."_Settings" USING btree ("B");


--
-- Name: Migration migrations_projectid_foreign; Type: FK CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."Migration"
    ADD CONSTRAINT migrations_projectid_foreign FOREIGN KEY ("projectId") REFERENCES management."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Settings Settings_user_fkey; Type: FK CONSTRAINT; Schema: postgres-table-1-to-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-table-1-to-1$dev"."Settings"
    ADD CONSTRAINT "Settings_user_fkey" FOREIGN KEY ("user") REFERENCES "postgres-table-1-to-1$dev"."User"(id) ON DELETE SET NULL;


--
-- Name: _Settings _Settings_A_fkey; Type: FK CONSTRAINT; Schema: postgres-table-1-to-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-table-1-to-1$dev"."_Settings"
    ADD CONSTRAINT "_Settings_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres-table-1-to-1$dev"."Settings"(id) ON DELETE CASCADE;


--
-- Name: _Settings _Settings_B_fkey; Type: FK CONSTRAINT; Schema: postgres-table-1-to-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-table-1-to-1$dev"."_Settings"
    ADD CONSTRAINT "_Settings_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres-table-1-to-1$dev"."User"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
