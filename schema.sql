DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS risks;
DROP TABLE IF EXISTS ht_lines;

CREATE TABLE ht_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat1 REAL NOT NULL,
    lng1 REAL NOT NULL,
    lat2 REAL NOT NULL,
    lng2 REAL NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cable_lines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    line_group TEXT,
    coordinates TEXT NOT NULL
);

CREATE TABLE risks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

CREATE TABLE locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    lat REAL NOT NULL,
    lng REAL NOT NULL,
    description TEXT
);

CREATE TABLE submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    location_id INTEGER NOT NULL,
    pic TEXT NOT NULL,
    obstacle_risk_id INTEGER NOT NULL,
    burnout_risk_id INTEGER NOT NULL,
    animal_risk_id INTEGER NOT NULL,
    security_risk_id INTEGER NOT NULL,
    size_risk_id INTEGER NOT NULL,
    remarks TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (obstacle_risk_id) REFERENCES risks(id),
    FOREIGN KEY (burnout_risk_id) REFERENCES risks(id),
    FOREIGN KEY (animal_risk_id) REFERENCES risks(id),
    FOREIGN KEY (security_risk_id) REFERENCES risks(id),
    FOREIGN KEY (size_risk_id) REFERENCES risks(id)
);

-- Seed initial risks data
INSERT INTO risks (name) VALUES ('Low'), ('Medium'), ('High');
