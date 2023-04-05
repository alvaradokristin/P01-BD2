DELIMITER //
# ---------------------- CRETAE THE DATABASE ---------------------- #
#-------------------------------------------------------------------#
CREATE DATABASE sharedatas;

USE sharedatas;
# ---------------------- CRETAE THE TABLES ---------------------- #
-- MESSAGES
CREATE TABLE messages (
  id INT NOT NULL AUTO_INCREMENT,
  sender_id VARCHAR(25) NOT NULL,
  receiver_id VARCHAR(25) NOT NULL,
  message_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

CREATE TABLE message_attachments (
  id INT NOT NULL AUTO_INCREMENT,
  message_id INT NOT NULL,
  filename VARCHAR(255) NOT NULL,
  filetype VARCHAR(30) NOT NULL,
  data LONGBLOB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (message_id) REFERENCES messages(id)
);

-- FOLLOWERS
CREATE TABLE followers (
  id INT NOT NULL AUTO_INCREMENT,
  user_id VARCHAR(25) NOT NULL,
  follower_id VARCHAR(25) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
);

# ---------------------- INSERTS ---------------------- #
INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario1', 'usuario2', 'Hola, ¿cómo estás?');

INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario2', 'usuario1', 'Hola! Todo bien, y tu?');

INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario3', 'usuario1', 'Hello!');

INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario4', 'usuario1', 'Buenos dias!');

INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario1', 'usuario2', 'Todo bien, todo bien, me compartes el url de tu data set?');

INSERT INTO messages (sender_id, receiver_id, message_text)
VALUES ('usuario2', 'usuario1', 'Si claro! Mira ahorita no lo tengo, pero dame unos minutos y lo busco :)');
