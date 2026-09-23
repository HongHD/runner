-- --------------------------------------------------------
-- 호스트:                          127.0.0.1
-- 서버 버전:                        11.8.5-MariaDB - MariaDB Server
-- 서버 OS:                        Win64
-- HeidiSQL 버전:                  10.2.0.5599
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;


-- ver1-1 데이터베이스 구조 내보내기
CREATE DATABASE IF NOT EXISTS `ver1-1` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `ver1-1`;

-- 테이블 ver1-1.admins 구조 내보내기
CREATE TABLE IF NOT EXISTS `admins` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL,
  `pin_code` varchar(6) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `email_2` (`email`),
  UNIQUE KEY `email_3` (`email`),
  UNIQUE KEY `email_4` (`email`),
  UNIQUE KEY `email_5` (`email`),
  UNIQUE KEY `email_6` (`email`),
  UNIQUE KEY `email_7` (`email`),
  UNIQUE KEY `email_8` (`email`),
  UNIQUE KEY `email_9` (`email`),
  UNIQUE KEY `email_10` (`email`),
  UNIQUE KEY `email_11` (`email`),
  UNIQUE KEY `email_12` (`email`),
  UNIQUE KEY `email_13` (`email`),
  UNIQUE KEY `email_14` (`email`),
  UNIQUE KEY `email_15` (`email`),
  UNIQUE KEY `email_16` (`email`),
  UNIQUE KEY `email_17` (`email`),
  UNIQUE KEY `email_18` (`email`),
  UNIQUE KEY `email_19` (`email`),
  UNIQUE KEY `email_20` (`email`),
  UNIQUE KEY `email_21` (`email`),
  UNIQUE KEY `email_22` (`email`),
  UNIQUE KEY `email_23` (`email`),
  UNIQUE KEY `email_24` (`email`),
  UNIQUE KEY `email_25` (`email`),
  UNIQUE KEY `email_26` (`email`),
  UNIQUE KEY `email_27` (`email`),
  UNIQUE KEY `email_28` (`email`),
  UNIQUE KEY `email_29` (`email`),
  UNIQUE KEY `email_30` (`email`),
  UNIQUE KEY `email_31` (`email`),
  UNIQUE KEY `email_32` (`email`),
  UNIQUE KEY `email_33` (`email`),
  UNIQUE KEY `email_34` (`email`),
  UNIQUE KEY `email_35` (`email`),
  UNIQUE KEY `email_36` (`email`),
  UNIQUE KEY `email_37` (`email`),
  UNIQUE KEY `email_38` (`email`),
  UNIQUE KEY `email_39` (`email`),
  UNIQUE KEY `email_40` (`email`),
  UNIQUE KEY `email_41` (`email`),
  UNIQUE KEY `email_42` (`email`),
  UNIQUE KEY `email_43` (`email`),
  UNIQUE KEY `email_44` (`email`),
  UNIQUE KEY `email_45` (`email`),
  UNIQUE KEY `email_46` (`email`),
  UNIQUE KEY `email_47` (`email`),
  UNIQUE KEY `email_48` (`email`),
  UNIQUE KEY `email_49` (`email`),
  UNIQUE KEY `email_50` (`email`),
  UNIQUE KEY `email_51` (`email`),
  UNIQUE KEY `email_52` (`email`),
  UNIQUE KEY `email_53` (`email`),
  UNIQUE KEY `email_54` (`email`),
  UNIQUE KEY `email_55` (`email`),
  UNIQUE KEY `email_56` (`email`),
  UNIQUE KEY `email_57` (`email`),
  UNIQUE KEY `email_58` (`email`),
  UNIQUE KEY `email_59` (`email`),
  UNIQUE KEY `email_60` (`email`),
  UNIQUE KEY `email_61` (`email`),
  UNIQUE KEY `email_62` (`email`),
  UNIQUE KEY `email_63` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.admins:~2 rows (대략적) 내보내기
DELETE FROM `admins`;
/*!40000 ALTER TABLE `admins` DISABLE KEYS */;
INSERT INTO `admins` (`id`, `name`, `email`, `password`, `created_at`, `pin_code`) VALUES
	(9, '??????', 'admin_test@test.com', '$2b$10$i4/yFaowlAZX0vQlHUYtQesc3ejrYo8Ilmr7B6ONrzC.IhBh68i2G', '2026-06-10 14:30:36', '830872'),
	(10, '홍희대', 'hhd77@hanmail.net', '$2b$10$.RoWjDszusOHAByM2D3q9uTlaeOZDExlBbgiGCakKm6hMPSwHHdWa', '2026-06-10 14:31:24', '836032');
/*!40000 ALTER TABLE `admins` ENABLE KEYS */;

-- 테이블 ver1-1.admin_game_type_settings 구조 내보내기
CREATE TABLE IF NOT EXISTS `admin_game_type_settings` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `game_type_id` int(11) NOT NULL,
  `is_active` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  UNIQUE KEY `admin_game_type_settings_admin_id_game_type_id` (`admin_id`,`game_type_id`),
  KEY `game_type_id` (`game_type_id`),
  CONSTRAINT `admin_game_type_settings_ibfk_10` FOREIGN KEY (`game_type_id`) REFERENCES `game_types` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `admin_game_type_settings_ibfk_9` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=111 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.admin_game_type_settings:~28 rows (대략적) 내보내기
DELETE FROM `admin_game_type_settings`;
/*!40000 ALTER TABLE `admin_game_type_settings` DISABLE KEYS */;
INSERT INTO `admin_game_type_settings` (`id`, `admin_id`, `game_type_id`, `is_active`) VALUES
	(83, 10, 18, 1),
	(84, 10, 22, 1),
	(85, 10, 19, 1),
	(86, 10, 20, 1),
	(87, 10, 21, 1),
	(88, 10, 24, 1),
	(89, 10, 23, 1),
	(90, 10, 25, 1),
	(91, 10, 26, 1),
	(92, 10, 27, 1),
	(93, 10, 28, 1),
	(94, 10, 1, 1),
	(95, 10, 2, 1),
	(96, 10, 3, 1),
	(97, 10, 4, 1),
	(98, 10, 5, 1),
	(99, 10, 6, 1),
	(100, 10, 7, 1),
	(101, 10, 8, 1),
	(102, 10, 9, 1),
	(103, 10, 10, 1),
	(104, 10, 11, 1),
	(105, 10, 12, 1),
	(106, 10, 13, 1),
	(107, 10, 14, 1),
	(108, 10, 15, 1),
	(109, 10, 16, 1),
	(110, 10, 17, 1);
/*!40000 ALTER TABLE `admin_game_type_settings` ENABLE KEYS */;

-- 테이블 ver1-1.answers 구조 내보내기
CREATE TABLE IF NOT EXISTS `answers` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `participant_id` int(11) NOT NULL,
  `question_id` int(11) NOT NULL,
  `option_id` int(11) DEFAULT NULL,
  `is_correct` tinyint(1) DEFAULT NULL,
  `response_time` int(11) DEFAULT NULL,
  `points_earned` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `participant_id` (`participant_id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `answers_ibfk_125` FOREIGN KEY (`participant_id`) REFERENCES `participants` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `answers_ibfk_126` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.answers:~0 rows (대략적) 내보내기
DELETE FROM `answers`;
/*!40000 ALTER TABLE `answers` DISABLE KEYS */;
/*!40000 ALTER TABLE `answers` ENABLE KEYS */;

-- 테이블 ver1-1.board_posts 구조 내보내기
CREATE TABLE IF NOT EXISTS `board_posts` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `participant_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `image_url` varchar(1024) DEFAULT NULL,
  `attachment_url` varchar(1024) DEFAULT NULL,
  `attachment_name` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `participant_id` (`participant_id`),
  CONSTRAINT `board_posts_ibfk_34` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `board_posts_ibfk_35` FOREIGN KEY (`participant_id`) REFERENCES `participants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.board_posts:~0 rows (대략적) 내보내기
DELETE FROM `board_posts`;
/*!40000 ALTER TABLE `board_posts` DISABLE KEYS */;
/*!40000 ALTER TABLE `board_posts` ENABLE KEYS */;

-- 테이블 ver1-1.games 구조 내보내기
CREATE TABLE IF NOT EXISTS `games` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `admin_id` int(11) NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `game_type` enum('quiz','ox','speed','survey','board','mole','stopwatch','multiple_choice','button_battle','speed_piano','speed_tile','empathy_vote','word_cloud') DEFAULT 'quiz',
  `pin_code` varchar(10) DEFAULT NULL,
  `status` enum('draft','active','finished') DEFAULT 'draft',
  `created_at` datetime NOT NULL,
  `settings` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`settings`)),
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `games_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `admins` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=35 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.games:~6 rows (대략적) 내보내기
DELETE FROM `games`;
/*!40000 ALTER TABLE `games` DISABLE KEYS */;
INSERT INTO `games` (`id`, `admin_id`, `title`, `description`, `game_type`, `pin_code`, `status`, `created_at`, `settings`) VALUES
	(29, 10, '새 4지선다형 (2026. 6. 10.)', '', 'multiple_choice', NULL, 'draft', '2026-06-10 14:31:58', NULL),
	(30, 10, '스피드 부저', NULL, 'speed', NULL, 'draft', '2026-06-10 14:33:16', NULL),
	(31, 10, '스피드 부저', NULL, 'speed', NULL, 'draft', '2026-06-10 14:33:16', NULL),
	(32, 10, '스피드 피아노', NULL, 'speed_piano', NULL, 'draft', '2026-06-10 14:33:29', NULL),
	(33, 10, '실시간 설문', NULL, 'survey', NULL, 'draft', '2026-06-17 07:04:41', NULL),
	(34, 10, '새 OX퀴즈 (2026. 7. 19.)', 'OX 게임입니다. ', 'ox', NULL, 'active', '2026-07-19 11:11:33', NULL);
/*!40000 ALTER TABLE `games` ENABLE KEYS */;

-- 테이블 ver1-1.game_sessions 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_sessions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` int(11) NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `ended_at` datetime DEFAULT NULL,
  `pin_code` varchar(10) DEFAULT NULL COMMENT '관리자 PIN 코드 (입장 시 사용)',
  `status` enum('waiting','active','finished') DEFAULT 'waiting',
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `game_sessions_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=498 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.game_sessions:~20 rows (대략적) 내보내기
DELETE FROM `game_sessions`;
/*!40000 ALTER TABLE `game_sessions` DISABLE KEYS */;
INSERT INTO `game_sessions` (`id`, `game_id`, `started_at`, `ended_at`, `pin_code`, `status`) VALUES
	(478, 29, '2026-06-10 14:32:09', '2026-06-10 14:32:14', '267394', 'finished'),
	(479, 29, '2026-06-10 14:32:14', '2026-06-10 14:32:56', '267394', 'finished'),
	(480, 29, '2026-06-10 14:32:56', '2026-06-10 14:33:04', '267394', 'finished'),
	(481, 29, '2026-06-10 14:33:04', '2026-06-10 14:33:16', '267394', 'finished'),
	(482, 29, '2026-06-10 14:33:16', NULL, '267394', 'finished'),
	(483, 30, '2026-06-10 14:33:16', NULL, '267394', 'finished'),
	(484, 31, '2026-06-10 14:33:17', '2026-06-10 14:33:23', '267394', 'finished'),
	(485, 31, '2026-06-10 14:33:25', '2026-06-10 14:33:25', '267394', 'finished'),
	(486, 31, '2026-06-10 14:33:25', '2026-06-10 14:33:29', '267394', 'finished'),
	(487, 31, '2026-06-10 14:33:29', NULL, '267394', 'waiting'),
	(488, 32, '2026-06-10 14:33:30', '2026-06-10 14:33:47', '267394', 'finished'),
	(489, 32, '2026-06-10 14:33:48', '2026-06-10 14:33:48', '267394', 'finished'),
	(490, 32, '2026-06-10 14:33:48', NULL, '267394', 'waiting'),
	(491, 32, '2026-06-17 07:03:56', '2026-06-17 07:04:22', '616332', 'finished'),
	(492, 32, '2026-06-17 07:04:22', NULL, '616332', 'finished'),
	(493, 30, '2026-06-17 07:04:22', NULL, '616332', 'finished'),
	(494, 30, '2026-06-17 07:04:23', '2026-06-17 07:04:30', '616332', 'finished'),
	(495, 33, '2026-06-17 07:04:42', NULL, '616332', 'active'),
	(496, 33, '2026-07-19 11:10:51', '2026-07-19 11:13:40', '933639', 'finished'),
	(497, 34, '2026-07-19 11:13:42', '2026-07-19 11:14:07', '933639', 'finished');
/*!40000 ALTER TABLE `game_sessions` ENABLE KEYS */;

-- 테이블 ver1-1.game_types 구조 내보내기
CREATE TABLE IF NOT EXISTS `game_types` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category` varchar(50) NOT NULL COMMENT '게임 카테고리 (예: 퀴즈·경쟁, 투표·소통, 랜덤·재미)',
  `category_icon` varchar(10) DEFAULT NULL COMMENT '카테고리 아이콘 이모지',
  `name` varchar(100) NOT NULL COMMENT '게임 이름',
  `description` varchar(255) DEFAULT NULL COMMENT '게임 설명',
  `badge` varchar(10) DEFAULT NULL COMMENT 'NEW, HOT, BETA 등 뱃지',
  `is_active` tinyint(1) DEFAULT 0 COMMENT '사용 여부 (활성화)',
  `order_num` int(11) DEFAULT 0 COMMENT '카테고리 내 정렬 순서',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.game_types:~27 rows (대략적) 내보내기
DELETE FROM `game_types`;
/*!40000 ALTER TABLE `game_types` DISABLE KEYS */;
INSERT INTO `game_types` (`id`, `category`, `category_icon`, `name`, `description`, `badge`, `is_active`, `order_num`, `created_at`, `updated_at`) VALUES
	(1, '퀴즈·경쟁', '🎯', '4지선다형', '객관식 퀴즈로 지식을 테스트', 'NEW', 1, 1, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(2, '퀴즈·경쟁', '🎯', 'OX퀴즈', 'O/X로 정답을 맞추는 퀴즈', 'NEW', 1, 2, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(3, '퀴즈·경쟁', '🎯', '스피드 부저', '가장 먼저 버저를 누른 사람 발표', 'NEW', 1, 3, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(4, '퀴즈·경쟁', '🎯', '스피드 피아노', '음계 순서 빠르게 치기 대결', 'NEW', 1, 4, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(5, '퀴즈·경쟁', '🎯', '스피드 타일', '섞인 타일 순서대로 완성 대결', 'NEW', 1, 5, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(6, '퀴즈·경쟁', '🎯', '두더지 게임', '올라오는 두더지 빠르게 잡기', 'NEW', 1, 6, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(7, '퀴즈·경쟁', '🎯', '버튼 배틀', '제한 시간 내 버튼 최다 클릭 대결', 'NEW', 1, 7, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(8, '퀴즈·경쟁', '🎯', '스탑워치', '정확한 시간에 멈추기 대결', 'NEW', 1, 8, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(9, '투표·소통', '💬', '공감투표', '실시간 투표 결과 확인', 'NEW', 1, 1, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(10, '투표·소통', '💬', '실시간 설문', '다중 설문 수집·실시간 결과 차트', NULL, 1, 2, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(11, '투표·소통', '💬', '익명 Q&A', '익명 질문 수집·좋아요 공감', NULL, 1, 3, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(12, '투표·소통', '💬', '워드클라우드', '키워드 실시간 시각화', NULL, 1, 4, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(13, '투표·소통', '💬', '게시판', '실시간 의견 수집 & 교체', 'NEW', 1, 5, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(14, '투표·소통', '💬', '평가하기', '별점 및 피드백 수집', 'NEW', 1, 6, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(15, '투표·소통', '💬', '그룹 만들기', '랜덤 그룹 자동 배정', 'NEW', 1, 7, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(16, '투표·소통', '💬', '미션빙고', '동성 미션 수행 빙고 게임', '준비중', 1, 8, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(17, '투표·소통', '💬', '스케치북', '이미지·글 포스트 자유 게시판', 'NEW', 1, 9, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(18, '랜덤·재미', '🎲', '행운권 추첨', '무작위 당첨자 선정', 'NEW', 1, 1, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(19, '랜덤·재미', '🎲', '빙고', '멀티플레이어 빙고', 'NEW', 1, 2, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(20, '랜덤·재미', '🎲', '팀 스프린트', '팀별 탭 영산 속도 대결', 'BETA', 1, 3, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(21, '랜덤·재미', '🎲', '풍선 터뜨리기', '팀 합산 타수로 풍선 먼저 터뜨리기', 'NEW', 1, 4, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(22, '랜덤·재미', '🎲', '초성게임', '팀별 초성 단어 완성 대결', 'NEW', 1, 5, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(23, '랜덤·재미', '🎲', '메모리게임', '카드 짝 맞추기 최소 시도 경쟁', 'NEW', 1, 6, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(24, '랜덤·재미', '🎲', '가위바위보', '1:1 토너먼트 가위바위보 대결', 'NEW', 1, 7, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(25, '랜덤·재미', '🎲', '핀볼 추첨기', '물리 기반 랜덤 추첨·동일 출발', 'NEW', 1, 8, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(26, '랜덤·재미', '🎲', '유리징검다리', '오징어게임·진짜유리를 찾아라', '준비중', 1, 9, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(27, '랜덤·재미', '🎲', '줄다리기', '오징어게임·팀 합산 탭으로 줄 당기기', '준비중', 1, 10, '2026-03-10 08:27:03', '2026-03-29 13:32:59'),
	(28, '랜덤·재미', '🎲', '사다리 게임', '사다리를 타고 내려가는 랜덤 게임. 팀전/개인전 가능', 'NEW', 1, 100, '2026-05-26 08:52:19', '2026-05-26 08:52:19');
/*!40000 ALTER TABLE `game_types` ENABLE KEYS */;

-- 테이블 ver1-1.notes 구조 내보내기
CREATE TABLE IF NOT EXISTS `notes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `participant_id` int(11) DEFAULT NULL,
  `content` text NOT NULL,
  `color` varchar(20) NOT NULL DEFAULT '#fbbf24',
  `x` float DEFAULT 0,
  `y` float DEFAULT 0,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  KEY `participant_id` (`participant_id`),
  CONSTRAINT `notes_ibfk_55` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `notes_ibfk_56` FOREIGN KEY (`participant_id`) REFERENCES `participants` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.notes:~0 rows (대략적) 내보내기
DELETE FROM `notes`;
/*!40000 ALTER TABLE `notes` DISABLE KEYS */;
INSERT INTO `notes` (`id`, `session_id`, `participant_id`, `content`, `color`, `x`, `y`, `created_at`, `updated_at`) VALUES
	(39, 495, 644, '수업이 재미있어요', '#fef08a', 36.5946, 13.9567, '2026-06-17 07:04:49', '2026-06-17 07:04:49');
/*!40000 ALTER TABLE `notes` ENABLE KEYS */;

-- 테이블 ver1-1.options 구조 내보내기
CREATE TABLE IF NOT EXISTS `options` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `question_id` int(11) NOT NULL,
  `option_text` varchar(500) NOT NULL,
  `is_correct` tinyint(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `question_id` (`question_id`),
  CONSTRAINT `options_ibfk_1` FOREIGN KEY (`question_id`) REFERENCES `questions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.options:~6 rows (대략적) 내보내기
DELETE FROM `options`;
/*!40000 ALTER TABLE `options` DISABLE KEYS */;
INSERT INTO `options` (`id`, `question_id`, `option_text`, `is_correct`) VALUES
	(27, 11, 'O', 1),
	(28, 11, 'X', 0),
	(29, 12, 'O', 0),
	(30, 12, 'X', 1),
	(31, 13, 'O', 1),
	(32, 13, 'X', 0);
/*!40000 ALTER TABLE `options` ENABLE KEYS */;

-- 테이블 ver1-1.participants 구조 내보내기
CREATE TABLE IF NOT EXISTS `participants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `session_id` int(11) NOT NULL,
  `nickname` varchar(100) NOT NULL,
  `score` int(11) DEFAULT 0,
  `socket_id` varchar(255) DEFAULT NULL,
  `joined_at` datetime DEFAULT NULL,
  `buzzed_at` datetime DEFAULT NULL,
  `rank` int(11) DEFAULT NULL,
  `team` varchar(30) DEFAULT NULL,
  `elapsed_ms` bigint(20) DEFAULT NULL COMMENT '부저 클릭 경과 시간(밀리쳐8)',
  PRIMARY KEY (`id`),
  KEY `session_id` (`session_id`),
  CONSTRAINT `participants_ibfk_1` FOREIGN KEY (`session_id`) REFERENCES `game_sessions` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=647 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.participants:~8 rows (대략적) 내보내기
DELETE FROM `participants`;
/*!40000 ALTER TABLE `participants` DISABLE KEYS */;
INSERT INTO `participants` (`id`, `session_id`, `nickname`, `score`, `socket_id`, `joined_at`, `buzzed_at`, `rank`, `team`, `elapsed_ms`) VALUES
	(639, 479, 'dfadf', 0, NULL, '2026-06-10 14:32:47', NULL, NULL, NULL, NULL),
	(640, 484, 'dfadf', 0, 'UHMZLaxaLxbjXPILAAAJ', '2026-06-10 14:33:17', '2026-06-10 14:33:18', 1, NULL, 880),
	(641, 488, 'dfadf', 847, 'UHMZLaxaLxbjXPILAAAJ', '2026-06-10 14:33:30', NULL, NULL, NULL, NULL),
	(642, 491, '홍희대', 0, 'paqcqde2ZXozBFyLAAAE', '2026-06-17 07:03:56', NULL, NULL, NULL, NULL),
	(643, 494, '홍희대', 0, 'paqcqde2ZXozBFyLAAAE', '2026-06-17 07:04:23', '2026-06-17 07:04:25', 1, NULL, 1091),
	(644, 495, '홍희대', 0, 'paqcqde2ZXozBFyLAAAE', '2026-06-17 07:04:42', NULL, NULL, NULL, NULL),
	(645, 496, '홍희대사용자', 0, NULL, '2026-07-19 11:10:51', NULL, NULL, NULL, NULL),
	(646, 497, '홍희대사용자', 2, 'BqLW29bxFudS63SOAAAE', '2026-07-19 11:13:42', NULL, NULL, NULL, NULL);
/*!40000 ALTER TABLE `participants` ENABLE KEYS */;

-- 테이블 ver1-1.questions 구조 내보내기
CREATE TABLE IF NOT EXISTS `questions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `game_id` int(11) NOT NULL,
  `order_num` int(11) NOT NULL,
  `question_text` text NOT NULL,
  `image_url` varchar(500) DEFAULT NULL,
  `time_limit` int(11) DEFAULT 30,
  `points` int(11) DEFAULT 100,
  PRIMARY KEY (`id`),
  KEY `game_id` (`game_id`),
  CONSTRAINT `questions_ibfk_1` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 테이블 데이터 ver1-1.questions:~3 rows (대략적) 내보내기
DELETE FROM `questions`;
/*!40000 ALTER TABLE `questions` DISABLE KEYS */;
INSERT INTO `questions` (`id`, `game_id`, `order_num`, `question_text`, `image_url`, `time_limit`, `points`) VALUES
	(11, 34, 1, '홍희대는 멋지다 인정? ', NULL, 30, 100),
	(12, 34, 2, '아인슈타인의 전공은 화학공학이다. ', NULL, 30, 100),
	(13, 34, 3, 'AI에게 역할부여하라는 것은 잘못된 학습의 결과이다. ', NULL, 30, 100);
/*!40000 ALTER TABLE `questions` ENABLE KEYS */;

/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IF(@OLD_FOREIGN_KEY_CHECKS IS NULL, 1, @OLD_FOREIGN_KEY_CHECKS) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
