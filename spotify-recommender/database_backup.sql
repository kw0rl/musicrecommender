-- MySQL dump 10.13  Distrib 8.0.42, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: project_music_fyp
-- ------------------------------------------------------
-- Server version	8.0.42

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `google_id` varchar(255) DEFAULT NULL,
  `auth_provider` enum('local','google') DEFAULT 'local',
  `password_hash` varchar(255) DEFAULT NULL,
  `role` enum('user','admin') NOT NULL DEFAULT 'user',
  `status` enum('active','inactive','pending_approval') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `spotify_access_token` text,
  `spotify_refresh_token` varchar(300) DEFAULT NULL,
  `spotify_token_expires_at` datetime DEFAULT NULL,
  `profile_image` varchar(255) DEFAULT NULL,
  `reset_token` varchar(255) DEFAULT NULL,
  `reset_token_expires` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `google_id` (`google_id`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (6,'taylor swift','taylorswift@gmail.com',NULL,'local','$2b$10$.iciK8EBFeWpcH5yN3pfo.rxmOX7mnQyukRmVj8bhmOHo5elhcJKW','admin','active','2025-06-09 09:20:40','2025-06-09 09:20:40',NULL,NULL,NULL,NULL,NULL,NULL),(8,'adminPending','pending@example.com',NULL,'local','$2b$10$tDCEr5MJ3AL0ZHKGjHHUCOqhCHOSYS03.4PYbft0Wo1yvgIdpTaFu','admin','active','2025-06-09 09:34:56','2025-06-09 09:42:48',NULL,NULL,NULL,NULL,NULL,NULL),(14,'azrul aqim','azrul@gmail.com',NULL,'local','$2b$10$aNUUKfgoQm.mUwhOf70tb.d6.w3N32xf8j7TN4bS2uAL.Z4KW4VcK','user','active','2025-06-09 11:11:26','2025-07-15 09:56:23','BQAEXFCzBF8nlJ1SCDcSKcaje3IMcMpGCntd0mj-bsZ9HoSpcj7os9dqVeuSrDqNeMWHnqNATulcN1UOpjr4j9VnG1uM1nftydPEaHwfWcmuqkX9YHI3ZJqGacysltI8vLCYQG3aWfOmOBqqhrlnwPX839NawDhWB1Kj6-tm1AX9nBJmmEHa4UL1-FrcphCuZBNltdEaia2Kz4ImLvtlFt3gAx9Ndeyl6J6921G1OKBaLriV8R7XeX67WCXm35KouHr50wcX2OXUemJjKZkjeyyba5uatAeKlKx6KgcADLKUUZ5TizN7kw0618qY8C5hnA','AQA_w6LOay51SFZoyla9dne_VT00k4TrXp3f-eNrj6QvvAViphaal7EtOEg-_kNrElpJuaN-k07WwJugQZoRBxEJt9SJ0sr1U687MUUiNeTTBaNER8O-wowaEE-QF8BhGmI','2025-07-15 18:56:23','/uploads/profile-images/profile-1752349246931-336090951.jpg',NULL,NULL),(15,'ira','ira@gmail.com',NULL,'local','$2b$10$AA9bb8i6/G1LDv2I3rpIBejqLTopiRlCYtYkgAyAVBZ4oRW3Eq/3q','user','active','2025-06-20 02:14:53','2025-06-20 02:14:53',NULL,NULL,NULL,NULL,NULL,NULL),(16,'daniel','daniel@gmail.com',NULL,'local','$2b$10$kAjgcmZ0rD6bnQSCuJlTkOXzDfiYJkAUem0svGgCgtgC/NsXEYzUq','admin','active','2025-06-20 02:16:42','2025-06-20 02:17:25',NULL,NULL,NULL,NULL,NULL,NULL),(19,'cat','cat@gmail.com',NULL,'local','$2b$10$LuENSAeqx.74YvZpirN3TOxXZxlJjpG4fqI9FZLmurRHFBEMMZ6ua','user','active','2025-06-22 17:24:14','2025-06-22 17:25:12','BQCdHG2TcbLRWoA6wZc790w6KmHxsIqCWcDEFCGp3j7nRlDS9NWiAVy4MCDQmPFWyBYIwQeBjsfnkysHXiImeXM8Vd3nXnL0q-HQz0J5UGf-f5A82dhVFRlcwxBrjLX7pTNEiAOrHEwthfl0pTCAk7jZYx0PGHfdg5Jkw1UsR9yyEUqBgZijJA6zdwWEKuJuON2ItAFiGC2ZLdd9fQmnyp_wm1dbg_ZD9oD1jz9_j-r2AruguNCcNLVerSn8yDndA1sr99BJco9MnKB2EBHNGksUhIvQ9awXzffjnoGnw9lDDC4i7ACRv_5rY6ltSITECA','AQA664EPLwlwUJ74UZpwJ6XcuB5v6TiB_BUrfU9NIXOV3IPX0sn7Uk50OiPH-5SS7saCX1ngvCVhgpi6bQIbJ26HN24KSs1BL8Fr3XDo32w--2Z4TX2_IQywmDNYHCrkOPg','2025-06-23 02:25:13',NULL,NULL,NULL),(20,'blake','blake@gmail.com',NULL,'local','$2b$10$EEd3EiP0v6k1wouINoW6tuPXO9/FVqTdkYiMDlpAjg1Y6i6cLnaXW','user','active','2025-06-22 17:39:45','2025-06-22 17:39:45',NULL,NULL,NULL,NULL,NULL,NULL),(21,'siti','siti@gmail.com',NULL,'local','$2b$10$Q/UOECuFkM0ALaMZJJHxOOGVRGdgdZmst8kOZW6.DpzgCPbwx2lSe','user','active','2025-06-23 02:19:18','2025-06-23 02:21:25','BQDkx8wTncGQkoiU3aSVStOkl7FLMg_TnUkcfO1AzqhoLe9E6BemceLMpBewsIvRo1gi8u-LdcuV1aIb5YCyp4wfd9_CblF-sOEmiS7BBJVK-LVJwxd0wfN9HkEWmjiJ9N6va1WqnY3WCMPFwJ1KeH0fGCVq1tAw4jYbNuUJZc58L7FMAXQ_SgyZHsu9GWghALqsAfsu_DC6pPRJ1PRYpAuRSeyHii6yrmwKzIyD-xBeyK8L0tjUKm8_2KKwy5rQnfCTj3vo8tQMCmLD4CHMkg8wFa4WiH7IfAlDLKMUohlQgyjqUfPIGibI-D1a06taBQ','AQDdh-euNmxApZFpE25K-iaBcA3rZh45iRUsO9aVLKuNj7tc56ovMO1u9j6YvL_97oDc4x2kmm2GHSCJD7Jo2ooG7AO8c7zlTluNuijWpNprxZJUp31ZmT2eaAkjGu_NqvE','2025-06-23 11:21:25',NULL,NULL,NULL),(22,'ayden','ayden@gmail.com',NULL,'local','$2b$10$2xfn6fSYRZIrW8vTlWEViuffNwXRjhoh6pzpDd2Ah6XAfZMFRl492','user','active','2025-07-12 20:17:13','2025-07-12 20:18:01','BQDbEH5K4VEbP-eCUnJrjp8Gj3TxkEPT_iPDm8noIcDk0sZZJtmE0zy0tHdE8RqrwEKEnrSXIz3SGvaBNyfYmlB0ObbYmEDJksPr9yhaplfsDp1x26G5rf4ykX6p4FJd8slYKU13dpjlkyycJWA9CCxqRf8mB_CmGfZGrKBSg2Lu4NmW2N8z8Ph4re2Hj1fiBa5gRfzVnKjMZMqnlNRrYDF_9VKHfUS8PRf0xkPFGZ4yAWfNLUvHN0TvNXFlqAvqhOeZpsS1jUc4Mv5g1aXTwzhTd9M1hvkc55IRKIvqJGRPWkUaAK_Fb_GNa852fxBgvA','AQBYhGPhQ4AK8qtNMgyHuzzmWgO9CPovvDUnuZQBmSy2sbhysjsuHumdLiy6MlmwKPqinaHduZ9fNKeNN6fx6JNcEMt55zn9of66lzx3z6g5HVzTGDAl-8c3oHAB4SpD94g','2025-07-13 05:18:01',NULL,NULL,NULL),(23,'azrul hensem','azrulcool@gmail.com',NULL,'local','$2b$10$/8VYdWWPH0ZS9VHPeZuMyuG16LLIeDbgaGvZ.uonh1Wn335k/4IMy','user','active','2025-07-13 08:58:07','2025-07-16 12:47:33','BQBEn7G87SpZ_ggYOlD-Dj4MM4PO_QPSjAntpIuRDwj7R98qG0hmgs8VGPCAOJlfSioD5bd47LIAU_3NdjL4sDNtx0U3PV9d2-liYsexTBwaY3INk8w0HgAYmtzGVSgKxT_cksbED-zoR9SyK7XpJpuXQhw0b3DEPJnvnAAgsQ7chJoBWPGqiMQy4QiOeN5vaXwGJtP0lrgki1EJKAxV4qi_SyTFCeCAtYyXbiIPXfaOm42JRAHHSIjmtKJ4ebuR8e9MwS9MQHahb5_CpCGS-JJz2_v9WysefMcf8bCnl1AFEEdesXKffZWAe1VzgkTiCQ','AQCyeBoOtkaQTGVC89ryfXYbW5G2gVmjuFfiY2u0aQHIRTalj_XAZ9TB5pGUuhpmuYAdcDxyTBtOBcdsj0gIQyd-Nw2fTpjjRblKm6876YH7le6fe9YQnsolEjHACZ3pTqw','2025-07-16 21:47:33',NULL,NULL,NULL),(24,'alison','alison@gmail.com',NULL,'local','$2b$10$eyz6jfVXOIcpv5V5ZkftSOonUeUqoMS84vWndU7QeCuQpKPiCDQa2','user','active','2025-07-15 10:00:37','2025-07-15 13:20:18','BQD1fKan973PcqnjztCjynqxbeazRPRMVSF02-qSXvdalTQbUm1XzSHB5hU4XZ6UmCTmKetgEsGMFQ5wXUxnHn8eokcLTy-elcZdXWPghQrUvJczskeOPLd2I8hstP5qh3H48lTWen62mFCbAhK_VhHMyLPBdMgJCRfDtz8VDCR5ngJ3w9jZQdnNlu32Rndx-PdAxDjS19Fjsuntb7dxqibmP4dun-Lr2oBkWerAhGCA_V-r8WHQ-gSAkYYx3HllWUfsPQrYoyBZ0kILDB41YBw8QVVMXM8hdfidjPQ66NvNNa4PH0pXXr4u0v7O9rwYEA','AQB1_qECZSk18ZW591wWnckRoTQjVdNNgD-HpIqJClUEqX0K4To3q0Fip9CVNIGpBkJI9f6WjTCOB1tdwjr7fF-CR6vk6Ng1XPpqrHdVpt7vHqz5Qn0sKPvJd6ndOI8WY1Q','2025-07-15 22:20:19','/uploads/profile-images/profile-1752578854483-146692904.jpg',NULL,NULL),(25,'potato','ihsan@gmail.com',NULL,'local','$2b$10$Cf6VIDz9dsr/BoY8y2XULuFni4YNukMEsCZf08ayTMHHusnHqb8Fe','user','inactive','2025-07-15 14:17:57','2025-07-15 14:46:48',NULL,NULL,NULL,NULL,NULL,NULL),(26,'yuza','yuza@gmail.com',NULL,'local','$2b$10$NyArv75q1Xah35acgBgtHOhtsst/huCqPXEHC7ooNEIWMwJhOYGFm','admin','active','2025-07-15 14:19:14','2025-07-15 14:19:58',NULL,NULL,NULL,NULL,NULL,NULL),(28,'azrul884','yalluto11@gmail.com','114052451574275670059','google',NULL,'user','active','2025-07-15 15:29:07','2025-07-15 16:52:20',NULL,NULL,NULL,'https://lh3.googleusercontent.com/a/ACg8ocIY2W0Y9cNLWDLiOitS-2IvRenddhDHMotNmIYX-bi-FLon30cW=s96-c','5b1f8b018bed0619a180ce72e00ed26564c67077404e3d22f5bfd284683f7a70','2025-07-16 01:52:21'),(29,'amirul.muhaimin678','wthvim@gmail.com','111811158802671230021','google',NULL,'user','active','2025-07-15 15:29:47','2025-07-15 15:32:33','BQA_K3DDQZsX3uSYq6ftjVOn-rUwnOtl2ir0IJ6z_omZHYsps01d9HppNOlsm_ML7YGqqWihJxRwX8AmYpwB6n_Ur2onT-qKOho6XYL1_WZebdusZvpoIcKUXC60Tw08UVlKbZAPVmZlYaBUyUCVqrPD8yyu20Yq_IxApQ_oEr28XLBJlqLSFpdFW6VsbBL4-Bq3nvH5PsZ0rXIleoUP0bWnS84XU7fuh7thMzTH39zzULxoa25YRKzYnK46GMoazcUx9xA49--QBog7Y3_SWWoqvQSsN6OSljyejU5kXBHc-_AQBN7gXqbRds58tw9Ozw','AQDxzC8R6waCRj-EmqakFaaSTOUl2nSM4fX4qpQ5La8aHN7GMFvOhmMKbI7dT6G6JB_VPPWmMcyvsnJi4ucS4U1E4DZYKqnNGaTtrZKllZcEjtW0GKLQiVrzhRJUUVEy95Q','2025-07-16 00:32:33','https://lh3.googleusercontent.com/a/ACg8ocJ4oP4GvxliNLfJ5Y4_iOzsRS-AqKexFpv_1wqc4EOAtFCieNI=s96-c',NULL,NULL),(30,'quwots','quwots@gmail.com',NULL,'local','$2b$10$erjmtoqMcyAcRGB96Y6SteKaEY8dSzkdxGYuDjCNwxePiUQiauFRC','user','active','2025-07-15 16:55:07','2025-07-15 16:56:28',NULL,NULL,NULL,NULL,NULL,NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-07-17 11:08:25
