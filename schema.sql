DROP TABLE IF EXISTS submissions;
DROP TABLE IF EXISTS locations;
DROP TABLE IF EXISTS risks;

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
    remarks TEXT,
    image_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id),
    FOREIGN KEY (obstacle_risk_id) REFERENCES risks(id),
    FOREIGN KEY (burnout_risk_id) REFERENCES risks(id),
    FOREIGN KEY (animal_risk_id) REFERENCES risks(id)
);

-- Seed initial risks data
INSERT INTO risks (name) VALUES ('Low'), ('Medium'), ('High');
