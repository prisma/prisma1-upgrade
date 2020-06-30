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
-- Name: postgres1-self-relation-has-many$dev; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA "postgres1-self-relation-has-many$dev";


ALTER SCHEMA "postgres1-self-relation-has-many$dev" OWNER TO root;

--
-- Name: postgres1-self-relation-has-one$dev; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA "postgres1-self-relation-has-one$dev";


ALTER SCHEMA "postgres1-self-relation-has-one$dev" OWNER TO root;

--
-- Name: postgres1-self-relation-many-to-many$dev; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA "postgres1-self-relation-many-to-many$dev";


ALTER SCHEMA "postgres1-self-relation-many-to-many$dev" OWNER TO root;

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
-- Name: User; Type: TABLE; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-many$dev"."User" (
    id character varying(25) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-many$dev"."User" OWNER TO root;

--
-- Name: _RelayId; Type: TABLE; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-many$dev"."_RelayId" (
    id character varying(36) NOT NULL,
    "stableModelIdentifier" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-many$dev"."_RelayId" OWNER TO root;

--
-- Name: _UserInvitation; Type: TABLE; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-many$dev"."_UserInvitation" (
    id character(25) NOT NULL,
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-many$dev"."_UserInvitation" OWNER TO root;

--
-- Name: User; Type: TABLE; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-one$dev"."User" (
    id character varying(25) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-one$dev"."User" OWNER TO root;

--
-- Name: _BestFriend; Type: TABLE; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-one$dev"."_BestFriend" (
    id character(25) NOT NULL,
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-one$dev"."_BestFriend" OWNER TO root;

--
-- Name: _RelayId; Type: TABLE; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-has-one$dev"."_RelayId" (
    id character varying(36) NOT NULL,
    "stableModelIdentifier" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-has-one$dev"."_RelayId" OWNER TO root;

--
-- Name: User; Type: TABLE; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-many-to-many$dev"."User" (
    id character varying(25) NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "postgres1-self-relation-many-to-many$dev"."User" OWNER TO root;

--
-- Name: _RelayId; Type: TABLE; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-many-to-many$dev"."_RelayId" (
    id character varying(36) NOT NULL,
    "stableModelIdentifier" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-many-to-many$dev"."_RelayId" OWNER TO root;

--
-- Name: _UserInvitation; Type: TABLE; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

CREATE TABLE "postgres1-self-relation-many-to-many$dev"."_UserInvitation" (
    id character(25) NOT NULL,
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres1-self-relation-many-to-many$dev"."_UserInvitation" OWNER TO root;

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
-- Name: User User_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-many$dev"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _UserInvitation _UserInvitation_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_pkey" PRIMARY KEY (id);


--
-- Name: _RelayId pk_RelayId; Type: CONSTRAINT; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-many$dev"."_RelayId"
    ADD CONSTRAINT "pk_RelayId" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-one$dev"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _BestFriend _BestFriend_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-one$dev"."_BestFriend"
    ADD CONSTRAINT "_BestFriend_pkey" PRIMARY KEY (id);


--
-- Name: _RelayId pk_RelayId; Type: CONSTRAINT; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-one$dev"."_RelayId"
    ADD CONSTRAINT "pk_RelayId" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-many-to-many$dev"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _UserInvitation _UserInvitation_pkey; Type: CONSTRAINT; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-many-to-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_pkey" PRIMARY KEY (id);


--
-- Name: _RelayId pk_RelayId; Type: CONSTRAINT; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-many-to-many$dev"."_RelayId"
    ADD CONSTRAINT "pk_RelayId" PRIMARY KEY (id);


--
-- Name: _UserInvitation_AB_unique; Type: INDEX; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

CREATE UNIQUE INDEX "_UserInvitation_AB_unique" ON "postgres1-self-relation-has-many$dev"."_UserInvitation" USING btree ("A", "B");


--
-- Name: _UserInvitation_B; Type: INDEX; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

CREATE INDEX "_UserInvitation_B" ON "postgres1-self-relation-has-many$dev"."_UserInvitation" USING btree ("B");


--
-- Name: _BestFriend_AB_unique; Type: INDEX; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

CREATE UNIQUE INDEX "_BestFriend_AB_unique" ON "postgres1-self-relation-has-one$dev"."_BestFriend" USING btree ("A", "B");


--
-- Name: _BestFriend_B; Type: INDEX; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

CREATE INDEX "_BestFriend_B" ON "postgres1-self-relation-has-one$dev"."_BestFriend" USING btree ("B");


--
-- Name: _UserInvitation_AB_unique; Type: INDEX; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

CREATE UNIQUE INDEX "_UserInvitation_AB_unique" ON "postgres1-self-relation-many-to-many$dev"."_UserInvitation" USING btree ("A", "B");


--
-- Name: _UserInvitation_B; Type: INDEX; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

CREATE INDEX "_UserInvitation_B" ON "postgres1-self-relation-many-to-many$dev"."_UserInvitation" USING btree ("B");


--
-- Name: Migration migrations_projectid_foreign; Type: FK CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."Migration"
    ADD CONSTRAINT migrations_projectid_foreign FOREIGN KEY ("projectId") REFERENCES management."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: _UserInvitation _UserInvitation_A_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres1-self-relation-has-many$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserInvitation _UserInvitation_B_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-has-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres1-self-relation-has-many$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _BestFriend _BestFriend_A_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-one$dev"."_BestFriend"
    ADD CONSTRAINT "_BestFriend_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres1-self-relation-has-one$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _BestFriend _BestFriend_B_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-has-one$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-has-one$dev"."_BestFriend"
    ADD CONSTRAINT "_BestFriend_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres1-self-relation-has-one$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserInvitation _UserInvitation_A_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-many-to-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres1-self-relation-many-to-many$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserInvitation _UserInvitation_B_fkey; Type: FK CONSTRAINT; Schema: postgres1-self-relation-many-to-many$dev; Owner: root
--

ALTER TABLE ONLY "postgres1-self-relation-many-to-many$dev"."_UserInvitation"
    ADD CONSTRAINT "_UserInvitation_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres1-self-relation-many-to-many$dev"."User"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
