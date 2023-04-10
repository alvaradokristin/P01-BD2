DELIMITER //
CREATE PROCEDURE `get_users_with_messages`(username VARCHAR(25))
BEGIN
	SELECT DISTINCT
    CASE
		WHEN sender_id = username THEN receiver_id
        WHEN sender_id != username THEN sender_id
        END AS user_id
  FROM messages
  WHERE sender_id = username OR receiver_id = username;
END;

CREATE PROCEDURE `get_messages_from_conversation`(fuser VARCHAR(25), suser VARCHAR(25))
BEGIN
	SELECT 
	  mgs.id,
	  sender_id,
	  receiver_id,
	  message_text,
	  DATE_FORMAT(mgs.created_at, '%d-%m-%Y %H:%i:%s') AS created_at,
      data,
      filetype
	  FROM messages AS mgs
      LEFT JOIN message_attachments AS msga ON mgs.id = msga.message_id
	  WHERE (sender_id = fuser AND receiver_id = suser) OR (sender_id = suser AND receiver_id = fuser)
      ORDER BY mgs.created_at;
END;

CREATE PROCEDURE `send_message`(fuser VARCHAR(25), suser VARCHAR(25), msgtext TEXT)
BEGIN
	INSERT INTO messages (sender_id, receiver_id, message_text)
	VALUES (fuser, suser, msgtext);
    
    SELECT 
	  mgs.id,
	  sender_id,
	  receiver_id,
	  message_text,
	  DATE_FORMAT(mgs.created_at, '%d-%m-%Y %H:%i:%s') AS created_at,
      data,
      filetype
	  FROM messages AS mgs
      LEFT JOIN message_attachments AS msga ON mgs.id = msga.message_id
	  WHERE (sender_id = fuser AND receiver_id = suser) OR (sender_id = suser AND receiver_id = fuser)
      ORDER BY mgs.created_at;
END;

CREATE PROCEDURE `send_message_w_file`(fuser VARCHAR(25), suser VARCHAR(25), msgtext TEXT, fname VARCHAR(255), ftype VARCHAR(30), fdata LONGBLOB)
BEGIN
	DECLARE last_insert_id INT;
    
	INSERT INTO messages (sender_id, receiver_id, message_text)
	VALUES (fuser, suser, msgtext);
    
    SET last_insert_id = LAST_INSERT_ID();
    
    INSERT INTO message_attachments (message_id, filename, filetype, data)
	VALUES (last_insert_id, fname, ftype, fdata);
    
    SELECT 
	  mgs.id,
	  sender_id,
	  receiver_id,
	  message_text,
	  DATE_FORMAT(mgs.created_at, '%d-%m-%Y %H:%i:%s') AS created_at,
      data,
      filetype
	  FROM messages AS mgs
      LEFT JOIN message_attachments AS msga ON mgs.id = msga.message_id
	  WHERE (sender_id = fuser AND receiver_id = suser) OR (sender_id = suser AND receiver_id = fuser)
      ORDER BY mgs.created_at;
END;

CREATE FUNCTION `is_following`(fuser VARCHAR(25), suser VARCHAR(25)) RETURNS tinyint(1)
    DETERMINISTIC
BEGIN
  DECLARE following BOOLEAN;
  SELECT COUNT(*) INTO following FROM followers WHERE user_id = fuser AND follower_id = suser;
  RETURN following;
END;

CREATE PROCEDURE `add_follower`(fuser VARCHAR(25), suser VARCHAR(25))
BEGIN
	INSERT INTO followers (user_id, follower_id)
	VALUES (suser, fuser);
    
    SELECT is_following( suser, fuser) AS following;
END;

CREATE PROCEDURE `unfollow_user`(fuser VARCHAR(25), suser VARCHAR(25))
BEGIN
	DELETE FROM followers WHERE follower_id = fuser AND user_id = suser;
    
    SELECT is_following( suser, fuser) AS following;
END;

CREATE PROCEDURE `users_following`(suser VARCHAR(25))
BEGIN
	SELECT DISTINCT 
	follower_id
    FROM followers
    WHERE user_id = suser;
END;

CREATE PROCEDURE `add_dataset_files`(ndataset_id INT, nfilename VARCHAR(255), nfiletype VARCHAR(30), ndata LONGBLOB, nimage_name VARCHAR(255), nimage_type VARCHAR(30), nimage_data LONGBLOB)
BEGIN
	DECLARE last_insert_id INT;

	INSERT INTO dataset_files (dataset_id, filename, filetype, data, image_name, image_type, image_data)
	VALUES (ndataset_id, nfilename, nfiletype, ndata, nimage_name, nimage_type, nimage_data);
    
    SET last_insert_id = LAST_INSERT_ID();
    
    SELECT 
	  *
	  FROM dataset_files
	  WHERE id = last_insert_id;
END;

CREATE PROCEDURE `get_files_from_dataset`(sdataset_id INT)
BEGIN
    SELECT
		*
	FROM dataset_files
    WHERE dataset_id = sdataset_id;
END;