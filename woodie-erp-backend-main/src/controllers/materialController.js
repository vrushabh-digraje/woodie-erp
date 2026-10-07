const { Material, MATERIAL_UNITS } = require("../models/Material");

function actorName(req) {
  return req.user?.name || "System";
}

function normalizeSku(sku) {
  return String(sku ?? "").trim().toUpperCase();
}

async function listMaterials(req, res) {
  try {
    const { q = "", activeOnly = "" } = req.query;
    const search = String(q).trim();
    const filter = {};

    if (String(activeOnly).toLowerCase() === "true") {
      filter.isActive = true;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { SKU: { $regex: search, $options: "i" } },
      ];
    }

    const data = await Material.find(filter).sort({ name: 1 });
    return res.json(data);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to list materials" });
  }
}

async function getMaterialById(req, res) {
  try {
    const doc = await Material.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Material not found" });
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to fetch material" });
  }
}

async function createMaterial(req, res) {
  try {
    const name = String(req.body?.name ?? "").trim();
    const SKU = normalizeSku(req.body?.SKU);
    const unit = String(req.body?.unit ?? "").trim();

    if (!name) return res.status(400).json({ message: "name is required" });
    if (!SKU) return res.status(400).json({ message: "SKU is required" });
    if (!MATERIAL_UNITS.includes(unit)) {
      return res.status(400).json({ message: `unit must be one of: ${MATERIAL_UNITS.join(", ")}` });
    }

    const dup = await Material.findOne({ SKU });
    if (dup) return res.status(400).json({ message: "SKU already exists" });

    const doc = await Material.create({
      name,
      SKU,
      unit,
      currentStock: Math.max(0, Number(req.body?.currentStock) || 0),
      minStockLevel: Math.max(0, Number(req.body?.minStockLevel) || 0),
      unitCost: Math.max(0, Number(req.body?.unitCost) || 0),
      isActive: req.body?.isActive !== false,
    });

    return res.status(201).json(doc);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "SKU already exists" });
    return res.status(500).json({ message: error.message || "Failed to create material" });
  }
}

async function updateMaterial(req, res) {
  try {
    const doc = await Material.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Material not found" });

    if (req.body?.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name) return res.status(400).json({ message: "name cannot be empty" });
      doc.name = name;
    }

    if (req.body?.SKU !== undefined) {
      const SKU = normalizeSku(req.body.SKU);
      if (!SKU) return res.status(400).json({ message: "SKU cannot be empty" });
      const dup = await Material.findOne({ SKU, _id: { $ne: doc._id } });
      if (dup) return res.status(400).json({ message: "SKU already exists" });
      doc.SKU = SKU;
    }

    if (req.body?.unit !== undefined) {
      const unit = String(req.body.unit).trim();
      if (!MATERIAL_UNITS.includes(unit)) {
        return res.status(400).json({ message: `unit must be one of: ${MATERIAL_UNITS.join(", ")}` });
      }
      doc.unit = unit;
    }

    if (req.body?.minStockLevel !== undefined) {
      doc.minStockLevel = Math.max(0, Number(req.body.minStockLevel) || 0);
    }
    if (req.body?.unitCost !== undefined) {
      doc.unitCost = Math.max(0, Number(req.body.unitCost) || 0);
    }
    if (req.body?.isActive !== undefined) {
      doc.isActive = Boolean(req.body.isActive);
    }

    await doc.save();
    return res.json(doc);
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ message: "SKU already exists" });
    return res.status(500).json({ message: error.message || "Failed to update material" });
  }
}

async function adjustMaterialStock(req, res) {
  try {
    const doc = await Material.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Material not found" });

    const type = String(req.body?.type ?? "").trim();
    const qty = Number(req.body?.qty);
    const note = String(req.body?.note ?? "").trim();

    if (!["in", "out"].includes(type)) {
      return res.status(400).json({ message: 'type must be "in" or "out"' });
    }
    if (!qty || qty <= 0 || Number.isNaN(qty)) {
      return res.status(400).json({ message: "qty must be a positive number" });
    }

    if (type === "out" && doc.currentStock < qty) {
      return res.status(400).json({ message: "Insufficient stock for this adjustment" });
    }

    doc.currentStock = type === "in" ? doc.currentStock + qty : doc.currentStock - qty;
    doc.stockTransactions.push({
      type,
      qty,
      note,
      by: req.user._id,
      byName: actorName(req),
      at: new Date(),
    });

    await doc.save();
    return res.json(doc);
  } catch (error) {
    return res.status(500).json({ message: error.message || "Failed to adjust stock" });
  }
}

module.exports = {
  listMaterials,
  getMaterialById,
  createMaterial,
  updateMaterial,
  adjustMaterialStock,
};
