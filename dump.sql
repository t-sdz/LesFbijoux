PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    , is_admin INTEGER DEFAULT 0);
INSERT INTO users VALUES(1,'test@test.com','$2b$10$0hwCLKtQe7.EX77pee6s3.u0UaxLJipVNGUUaGhNcQgPEfRgW4fHi','2026-04-27 15:48:59',0);
INSERT INTO users VALUES(2,'test.test.test@test','$2b$10$1Mid3m2Y7ns.yEgSdRDFjeLxd8bbUSDZgTC30FP9wJ.GpgvNOznnu','2026-04-27 16:19:20',0);
INSERT INTO users VALUES(3,'test.test@test','$2b$10$wgN91r5NI3F/.ynX09kj1.dgjEPSb000zkDj8uD7gED4hWTt.0HwK','2026-04-28 06:25:57',0);
INSERT INTO users VALUES(4,'admin@eclat.fr','$2b$10$iMsCOxOLi/XVRtux.9E3e.EO.7BuuARzRYOju4ooAhZV9cb8dNCGy','2026-04-29 09:49:55',1);
CREATE TABLE products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        price REAL NOT NULL,
        image TEXT,
        category TEXT
    );
INSERT INTO products VALUES(9,'Collier Or',NULL,49.9900000000000019,'collier.jpg','colliers');
INSERT INTO products VALUES(10,'Bracelet Argent',NULL,29.9899999999999984,'bracelet.jpg','bracelets');
INSERT INTO products VALUES(11,'Boucles d''oreilles Perles',NULL,19.9899999999999984,'boucles.jpg','boucles');
INSERT INTO products VALUES(13,'bague test','test',52.0,'1777456504533-817611028.jpg','bagues');
INSERT INTO products VALUES(14,'collier test','tess',21.0,'1777458175309-815444504.jpg','colliers');
INSERT INTO products VALUES(17,'boucle tess','acier inoxydable',13.0,'1777633729953-121001817.jpg','boucle');
CREATE TABLE cart_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
    );
INSERT INTO cart_items VALUES(1,1,1,1);
CREATE TABLE collections (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE NOT NULL, image TEXT DEFAULT 'default.jpg');
INSERT INTO collections VALUES(1,'colliers','1777547638831-69409916.jpg');
INSERT INTO collections VALUES(2,'bracelets','1777547666045-91139859.jpg');
INSERT INTO collections VALUES(3,'boucles','1777547657762-523901409.jpg');
INSERT INTO collections VALUES(4,'bagues','1777547648234-104050017.jpg');
INSERT INTO collections VALUES(5,'été','default.jpg');
INSERT INTO collections VALUES(6,'boucle','default.jpg');
INSERT INTO collections VALUES(7,'PROMOS','1777633751988-314704149.jpg');
CREATE TABLE hero_images (id INTEGER PRIMARY KEY AUTOINCREMENT, image TEXT NOT NULL, position INTEGER DEFAULT 0, position_x TEXT DEFAULT 'center', position_y TEXT DEFAULT 'center', size TEXT DEFAULT '1x1', fullscreen_x INTEGER DEFAULT 50, fullscreen_y INTEGER DEFAULT 50);
INSERT INTO hero_images VALUES(1,'1777889472857-29310726.jpg',1,'100','87','1x1',50,50);
INSERT INTO hero_images VALUES(2,'1777889591070-199594505.jpg',2,'100','100','1x1',50,50);
INSERT INTO hero_images VALUES(3,'1777889496384-742889023.jpg',3,'100','94','1x1',50,50);
INSERT INTO hero_images VALUES(4,'1777889627780-564368039.jpg',4,'49','100','1x1',50,50);
INSERT INTO hero_images VALUES(5,'1777889545123-476983294.jpg',5,'93','67','1x1',50,50);
INSERT INTO hero_images VALUES(6,'1777889532966-142461292.jpg',6,'54','66','1x1',50,50);
INSERT INTO hero_images VALUES(7,'1777889574147-275649678.jpg',7,'100','78','1x1',50,50);
INSERT INTO hero_images VALUES(8,'1777889613018-610867252.jpg',8,'100','100','1x1',50,50);
DELETE FROM sqlite_sequence;
INSERT INTO sqlite_sequence VALUES('products',17);
INSERT INTO sqlite_sequence VALUES('users',4);
INSERT INTO sqlite_sequence VALUES('cart_items',3);
INSERT INTO sqlite_sequence VALUES('collections',7);
INSERT INTO sqlite_sequence VALUES('hero_images',8);
COMMIT;
