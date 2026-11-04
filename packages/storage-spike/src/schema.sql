PRAGMA user_version=1;
CREATE TABLE project (id TEXT PRIMARY KEY, metadata_json TEXT NOT NULL);
CREATE TABLE document (
 node_id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES project(id),
 content TEXT NOT NULL, revision INTEGER NOT NULL CHECK(revision>=0)
);
CREATE TABLE revision (
 node_id TEXT NOT NULL REFERENCES document(node_id), sequence INTEGER NOT NULL CHECK(sequence>=0),
 content TEXT NOT NULL, checksum TEXT NOT NULL, created_at TEXT NOT NULL,
 PRIMARY KEY(node_id,sequence)
);
CREATE TABLE command (
 operation_id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL, result_json TEXT NOT NULL
);
