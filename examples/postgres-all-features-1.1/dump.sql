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
-- Name: postgres-all-features-1-1$dev; Type: SCHEMA; Schema: -; Owner: root
--

CREATE SCHEMA "postgres-all-features-1-1$dev";


ALTER SCHEMA "postgres-all-features-1-1$dev" OWNER TO root;

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
-- Name: Home_id_seq; Type: SEQUENCE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE SEQUENCE "postgres-all-features-1-1$dev"."Home_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER TABLE "postgres-all-features-1-1$dev"."Home_id_seq" OWNER TO root;

--
-- Name: Home; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Home" (
    id integer DEFAULT nextval('"postgres-all-features-1-1$dev"."Home_id_seq"'::regclass) NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."Home" OWNER TO root;

--
-- Name: IdentificationDocument; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."IdentificationDocument" (
    id character varying(25) NOT NULL,
    "documentNumber" text NOT NULL,
    "issuedOn" timestamp(3) without time zone NOT NULL,
    "expiresOn" timestamp(3) without time zone NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."IdentificationDocument" OWNER TO root;

--
-- Name: Tagline; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Tagline" (
    id character varying(25) NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text,
    excerpt text NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."Tagline" OWNER TO root;

--
-- Name: Tagline_visibility; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Tagline_visibility" (
    "nodeId" character varying(25) NOT NULL,
    "position" integer NOT NULL,
    value text NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."Tagline_visibility" OWNER TO root;

--
-- Name: TaxDocument; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."TaxDocument" (
    id character varying(25) NOT NULL,
    "documentNumber" text NOT NULL,
    "issuedOn" timestamp(3) without time zone NOT NULL,
    "expiresOn" timestamp(3) without time zone NOT NULL,
    "lastChangedOn" timestamp(3) without time zone
);


ALTER TABLE "postgres-all-features-1-1$dev"."TaxDocument" OWNER TO root;

--
-- Name: Thought; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Thought" (
    id character varying(25) NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "baseIdea" text
);


ALTER TABLE "postgres-all-features-1-1$dev"."Thought" OWNER TO root;

--
-- Name: Thought_content; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Thought_content" (
    "nodeId" character varying(25) NOT NULL,
    "position" integer NOT NULL,
    value text NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."Thought_content" OWNER TO root;

--
-- Name: User; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."User" (
    id character varying(25) NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    email text NOT NULL,
    age integer NOT NULL,
    type text NOT NULL,
    "isActive" boolean NOT NULL,
    temperature numeric(65,30),
    meta text,
    "friendlyName" text,
    "godFather" character varying(25),
    home integer,
    "taxDocument" character varying(25),
    "identificationDocument" character varying(25),
    "bestFriend" character varying(25),
    tagline character varying(25)
);


ALTER TABLE "postgres-all-features-1-1$dev"."User" OWNER TO root;

--
-- Name: Work; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."Work" (
    id character varying(25) NOT NULL,
    "createdAt" timestamp(3) without time zone NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    title text,
    description text
);


ALTER TABLE "postgres-all-features-1-1$dev"."Work" OWNER TO root;

--
-- Name: _ThoughtToUser; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."_ThoughtToUser" (
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."_ThoughtToUser" OWNER TO root;

--
-- Name: _UserFriends; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."_UserFriends" (
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."_UserFriends" OWNER TO root;

--
-- Name: _UserToWork; Type: TABLE; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE TABLE "postgres-all-features-1-1$dev"."_UserToWork" (
    "A" character varying(25) NOT NULL,
    "B" character varying(25) NOT NULL
);


ALTER TABLE "postgres-all-features-1-1$dev"."_UserToWork" OWNER TO root;

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
-- Name: Home Home_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Home"
    ADD CONSTRAINT "Home_pkey" PRIMARY KEY (id);


--
-- Name: IdentificationDocument IdentificationDocument_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."IdentificationDocument"
    ADD CONSTRAINT "IdentificationDocument_pkey" PRIMARY KEY (id);


--
-- Name: Tagline Tagline_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Tagline"
    ADD CONSTRAINT "Tagline_pkey" PRIMARY KEY (id);


--
-- Name: Tagline_visibility Tagline_visibility_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Tagline_visibility"
    ADD CONSTRAINT "Tagline_visibility_pkey" PRIMARY KEY ("nodeId", "position");


--
-- Name: TaxDocument TaxDocument_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."TaxDocument"
    ADD CONSTRAINT "TaxDocument_pkey" PRIMARY KEY (id);


--
-- Name: Thought_content Thought_content_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Thought_content"
    ADD CONSTRAINT "Thought_content_pkey" PRIMARY KEY ("nodeId", "position");


--
-- Name: Thought Thought_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Thought"
    ADD CONSTRAINT "Thought_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: Work Work_pkey; Type: CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Work"
    ADD CONSTRAINT "Work_pkey" PRIMARY KEY (id);


--
-- Name: _ThoughtToUser_AB_unique; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE UNIQUE INDEX "_ThoughtToUser_AB_unique" ON "postgres-all-features-1-1$dev"."_ThoughtToUser" USING btree ("A", "B");


--
-- Name: _ThoughtToUser_B; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE INDEX "_ThoughtToUser_B" ON "postgres-all-features-1-1$dev"."_ThoughtToUser" USING btree ("B");


--
-- Name: _UserFriends_AB_unique; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE UNIQUE INDEX "_UserFriends_AB_unique" ON "postgres-all-features-1-1$dev"."_UserFriends" USING btree ("A", "B");


--
-- Name: _UserFriends_B; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE INDEX "_UserFriends_B" ON "postgres-all-features-1-1$dev"."_UserFriends" USING btree ("B");


--
-- Name: _UserToWork_AB_unique; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE UNIQUE INDEX "_UserToWork_AB_unique" ON "postgres-all-features-1-1$dev"."_UserToWork" USING btree ("A", "B");


--
-- Name: _UserToWork_B; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE INDEX "_UserToWork_B" ON "postgres-all-features-1-1$dev"."_UserToWork" USING btree ("B");


--
-- Name: postgres-all-features-1-1$dev.User.email._UNIQUE; Type: INDEX; Schema: postgres-all-features-1-1$dev; Owner: root
--

CREATE UNIQUE INDEX "postgres-all-features-1-1$dev.User.email._UNIQUE" ON "postgres-all-features-1-1$dev"."User" USING btree (email);


--
-- Name: Migration migrations_projectid_foreign; Type: FK CONSTRAINT; Schema: management; Owner: root
--

ALTER TABLE ONLY management."Migration"
    ADD CONSTRAINT migrations_projectid_foreign FOREIGN KEY ("projectId") REFERENCES management."Project"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tagline_visibility Tagline_visibility_nodeId_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Tagline_visibility"
    ADD CONSTRAINT "Tagline_visibility_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "postgres-all-features-1-1$dev"."Tagline"(id);


--
-- Name: Thought_content Thought_content_nodeId_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."Thought_content"
    ADD CONSTRAINT "Thought_content_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "postgres-all-features-1-1$dev"."Thought"(id);


--
-- Name: User User_bestFriend_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_bestFriend_fkey" FOREIGN KEY ("bestFriend") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE SET NULL;


--
-- Name: User User_godFather_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_godFather_fkey" FOREIGN KEY ("godFather") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE SET NULL;


--
-- Name: User User_home_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_home_fkey" FOREIGN KEY (home) REFERENCES "postgres-all-features-1-1$dev"."Home"(id) ON DELETE SET NULL;


--
-- Name: User User_identificationDocument_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_identificationDocument_fkey" FOREIGN KEY ("identificationDocument") REFERENCES "postgres-all-features-1-1$dev"."IdentificationDocument"(id) ON DELETE SET NULL;


--
-- Name: User User_tagline_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_tagline_fkey" FOREIGN KEY (tagline) REFERENCES "postgres-all-features-1-1$dev"."Tagline"(id) ON DELETE SET NULL;


--
-- Name: User User_taxDocument_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."User"
    ADD CONSTRAINT "User_taxDocument_fkey" FOREIGN KEY ("taxDocument") REFERENCES "postgres-all-features-1-1$dev"."TaxDocument"(id) ON DELETE SET NULL;


--
-- Name: _ThoughtToUser _ThoughtToUser_A_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_ThoughtToUser"
    ADD CONSTRAINT "_ThoughtToUser_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres-all-features-1-1$dev"."Thought"(id) ON DELETE CASCADE;


--
-- Name: _ThoughtToUser _ThoughtToUser_B_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_ThoughtToUser"
    ADD CONSTRAINT "_ThoughtToUser_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserFriends _UserFriends_A_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_UserFriends"
    ADD CONSTRAINT "_UserFriends_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserFriends _UserFriends_B_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_UserFriends"
    ADD CONSTRAINT "_UserFriends_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserToWork _UserToWork_A_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_UserToWork"
    ADD CONSTRAINT "_UserToWork_A_fkey" FOREIGN KEY ("A") REFERENCES "postgres-all-features-1-1$dev"."User"(id) ON DELETE CASCADE;


--
-- Name: _UserToWork _UserToWork_B_fkey; Type: FK CONSTRAINT; Schema: postgres-all-features-1-1$dev; Owner: root
--

ALTER TABLE ONLY "postgres-all-features-1-1$dev"."_UserToWork"
    ADD CONSTRAINT "_UserToWork_B_fkey" FOREIGN KEY ("B") REFERENCES "postgres-all-features-1-1$dev"."Work"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
