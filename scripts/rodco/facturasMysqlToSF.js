const moment = require("moment");
const { xeroApi, redis } = require("../../helpers/xero");
const { sfConn, bulk, query } = require("../../helpers/sf");
const getKnex = require("../../helpers/mysql");
const { Parser } = require("json2csv");
const request = require("superagent");

let knex;

module.exports = async function Run(integrationMap) {
  try {
    const conn = await sfConn(integrationMap["salesforce"]);

    knex = await getKnex(integrationMap["mysql"]);

    var documentos = await knex
      .table("documento")
      .select(
        "documento.consecutivo",
        "documento.fecha",
        "documento.moneda",
        "documento.tipoCambio",
        "documento.totalComprobante as total",
        "pdf",
        "xml",
        "documento.plazo",

        "respuestaXml",
        "documento.tipo",
        "totalImpuesto as impuesto",
        "documento.tipoCambio",
        "cliente.name as cliente_nombre",
        "cliente.cedula as cliente_cedula"
      )
      .leftJoin("cliente", "cliente.id", "documento.clienteId")
      .where("documento.tipo", "FA");

    let facturas = await query(
      conn,
      "select id,name from factura__c where fecha__c < 2019-12-20"
    );
    console.log("h");

    const facturasMap = {};
    facturas.forEach((item) => {
      facturasMap[item.name] = item;
    });

    documentos = documentos
      .filter((documento) => {
        return !facturasMap[documento.consecutivo];
      })
      .map((item) => {
        return {
          name: item.consecutivo,
          external_id__c: "MYSQL_" + item.consecutivo,
          total__c: parseFloat(item.total),
          cliente_nombre__c: item.cliente_nombre,
          cliente_cedula__c: item.cliente_cedula,
          saldo__c: 0,
          impuesto__c: parseFloat(item.impuesto),
          fecha__c: moment(item.fecha).format("YYYY-MM-DD"),
          vence__c: moment(item.fecha)
            .add(item.plazo, "days")
            .format("YYYY-MM-DD"),
        };
      });

    console.log(documentos.length);

    await bulk(conn, "Factura__c", "upsert", "external_id__c", documentos);
  } catch (e) {
    console.log(e);
    throw e;
  }
};
