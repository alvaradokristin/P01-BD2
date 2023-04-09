const neo4j = require("neo4j-driver");
const { DisconnectsClientError } = require("redis");

const driver = neo4j.driver(
  "bolt://127.0.0.1:7687",
  neo4j.auth.basic("neo4j", "12345678")
);

async function queryRun(query) {
  const session = driver.session();

  const response = await session.run(query);

  const datasetResults = response.records.map((record) => {
    return {
      id: record.get("id").toNumber(),
      userCreator: record.get("userCreator"),
      nombre: record.get("nombre"),
      descripcion: record.get("descripcion"),
      fecha: record.get("fecha"),
    };
  });

  session.close();
  return datasetResults;
}

module.exports = queryRun;
