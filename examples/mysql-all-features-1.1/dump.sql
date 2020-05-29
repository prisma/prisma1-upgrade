-- MySQL dump 10.13  Distrib 5.7.29, for osx10.15 (x86_64)
--
-- Host: 0.0.0.0    Database: mysql-all-features-1-1@dev
-- ------------------------------------------------------
-- Server version	5.7.30

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `Home`
--

DROP TABLE IF EXISTS `Home`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Home` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `IdentificationDocument`
--

DROP TABLE IF EXISTS `IdentificationDocument`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `IdentificationDocument` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `documentNumber` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `issuedOn` datetime(3) NOT NULL,
  `expiresOn` datetime(3) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tagline`
--

DROP TABLE IF EXISTS `Tagline`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Tagline` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `description` mediumtext COLLATE utf8mb4_unicode_ci,
  `excerpt` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Tagline_visibility`
--

DROP TABLE IF EXISTS `Tagline_visibility`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Tagline_visibility` (
  `nodeId` char(25) CHARACTER SET utf8 NOT NULL,
  `position` int(4) NOT NULL,
  `value` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`nodeId`,`position`),
  KEY `value` (`value`),
  CONSTRAINT `Tagline_visibility_ibfk_1` FOREIGN KEY (`nodeId`) REFERENCES `Tagline` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `TaxDocument`
--

DROP TABLE IF EXISTS `TaxDocument`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `TaxDocument` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `documentNumber` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `issuedOn` datetime(3) NOT NULL,
  `expiresOn` datetime(3) NOT NULL,
  `lastChangedOn` datetime(3) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Thought`
--

DROP TABLE IF EXISTS `Thought`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Thought` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `baseIdea` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Thought_content`
--

DROP TABLE IF EXISTS `Thought_content`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Thought_content` (
  `nodeId` char(25) CHARACTER SET utf8 NOT NULL,
  `position` int(4) NOT NULL,
  `value` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  PRIMARY KEY (`nodeId`,`position`),
  KEY `value` (`value`(191)),
  CONSTRAINT `Thought_content_ibfk_1` FOREIGN KEY (`nodeId`) REFERENCES `Thought` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `User`
--

DROP TABLE IF EXISTS `User`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `User` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `email` mediumtext COLLATE utf8mb4_unicode_ci NOT NULL,
  `age` int(11) NOT NULL,
  `type` varchar(191) COLLATE utf8mb4_unicode_ci NOT NULL,
  `isActive` tinyint(1) NOT NULL,
  `temperature` decimal(65,30) DEFAULT NULL,
  `meta` mediumtext COLLATE utf8mb4_unicode_ci,
  `friendlyName` mediumtext COLLATE utf8mb4_unicode_ci,
  `godFather` char(25) CHARACTER SET utf8 DEFAULT NULL,
  `home` int(11) DEFAULT NULL,
  `taxDocument` char(25) CHARACTER SET utf8 DEFAULT NULL,
  `identificationDocument` char(25) CHARACTER SET utf8 DEFAULT NULL,
  `bestFriend` char(25) CHARACTER SET utf8 DEFAULT NULL,
  `tagline` char(25) CHARACTER SET utf8 DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_UNIQUE` (`email`(191)),
  KEY `godFather` (`godFather`),
  KEY `home` (`home`),
  KEY `taxDocument` (`taxDocument`),
  KEY `identificationDocument` (`identificationDocument`),
  KEY `bestFriend` (`bestFriend`),
  KEY `tagline` (`tagline`),
  CONSTRAINT `User_ibfk_1` FOREIGN KEY (`godFather`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `User_ibfk_2` FOREIGN KEY (`home`) REFERENCES `Home` (`id`) ON DELETE SET NULL,
  CONSTRAINT `User_ibfk_3` FOREIGN KEY (`taxDocument`) REFERENCES `TaxDocument` (`id`) ON DELETE SET NULL,
  CONSTRAINT `User_ibfk_4` FOREIGN KEY (`identificationDocument`) REFERENCES `IdentificationDocument` (`id`) ON DELETE SET NULL,
  CONSTRAINT `User_ibfk_5` FOREIGN KEY (`bestFriend`) REFERENCES `User` (`id`) ON DELETE SET NULL,
  CONSTRAINT `User_ibfk_6` FOREIGN KEY (`tagline`) REFERENCES `Tagline` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `Work`
--

DROP TABLE IF EXISTS `Work`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `Work` (
  `id` char(25) CHARACTER SET utf8 NOT NULL,
  `createdAt` datetime(3) NOT NULL,
  `updatedAt` datetime(3) NOT NULL,
  `title` mediumtext COLLATE utf8mb4_unicode_ci,
  `description` mediumtext COLLATE utf8mb4_unicode_ci,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_ThoughtToUser`
--

DROP TABLE IF EXISTS `_ThoughtToUser`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_ThoughtToUser` (
  `A` char(25) CHARACTER SET utf8 NOT NULL,
  `B` char(25) CHARACTER SET utf8 NOT NULL,
  UNIQUE KEY `ThoughtToUser_AB_unique` (`A`,`B`),
  KEY `B` (`B`),
  CONSTRAINT `_ThoughtToUser_ibfk_1` FOREIGN KEY (`A`) REFERENCES `Thought` (`id`) ON DELETE CASCADE,
  CONSTRAINT `_ThoughtToUser_ibfk_2` FOREIGN KEY (`B`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_UserFriends`
--

DROP TABLE IF EXISTS `_UserFriends`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_UserFriends` (
  `A` char(25) CHARACTER SET utf8 NOT NULL,
  `B` char(25) CHARACTER SET utf8 NOT NULL,
  UNIQUE KEY `UserFriends_AB_unique` (`A`,`B`),
  KEY `B` (`B`),
  CONSTRAINT `_UserFriends_ibfk_1` FOREIGN KEY (`A`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `_UserFriends_ibfk_2` FOREIGN KEY (`B`) REFERENCES `User` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `_UserToWork`
--

DROP TABLE IF EXISTS `_UserToWork`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `_UserToWork` (
  `A` char(25) CHARACTER SET utf8 NOT NULL,
  `B` char(25) CHARACTER SET utf8 NOT NULL,
  UNIQUE KEY `UserToWork_AB_unique` (`A`,`B`),
  KEY `B` (`B`),
  CONSTRAINT `_UserToWork_ibfk_1` FOREIGN KEY (`A`) REFERENCES `User` (`id`) ON DELETE CASCADE,
  CONSTRAINT `_UserToWork_ibfk_2` FOREIGN KEY (`B`) REFERENCES `Work` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2020-05-29 16:01:06