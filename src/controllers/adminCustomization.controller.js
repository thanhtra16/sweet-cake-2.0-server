const Customization = require("../models/customizations");

const OPTION_FIELDS = [
  "sizes",
  "fillings",
  "bases",
  "frostingColors",
  "sweetnessLevels",
];

const ALLOWED_FIELDS = [
  ...OPTION_FIELDS,
  "required",
  "bannedWords",
];

const REQUIRED_FIELDS = [
  "base",
  "frostingColor",
  "sweetness",
];

const isPlainObject = (value) =>
  value !== null &&
  typeof value === "object" &&
  !Array.isArray(value);

const validateOptions = (options, field) => {
  if (!Array.isArray(options)) {
    return `${field} phải là một mảng`;
  }

  const names = new Set();

  for (const option of options) {
    if (!isPlainObject(option)) {
      return `Mỗi phần tử trong ${field} phải là một object`;
    }

    const allowedOptionFields = [
      "name",
      "priceDiff",
      "isDefault",
      "active",
      "maxChars",
    ];

    const unknownFields = Object.keys(option).filter(
      (key) => !allowedOptionFields.includes(key)
    );

    if (unknownFields.length > 0) {
      return `Trường không hợp lệ trong ${field}: ${unknownFields.join(", ")}`;
    }

    if (
      typeof option.name !== "string" ||
      !option.name.trim()
    ) {
      return `Tên lựa chọn trong ${field} không được để trống`;
    }

    const normalizedName = option.name
      .normalize("NFC")
      .trim()
      .toLocaleLowerCase();

    if (names.has(normalizedName)) {
      return `Tên lựa chọn bị trùng trong ${field}: ${option.name}`;
    }

    names.add(normalizedName);

    if (
      option.priceDiff !== undefined &&
      (!Number.isFinite(option.priceDiff) || option.priceDiff < 0)
    ) {
      return `Phụ phí của ${option.name} phải là số không âm`;
    }

    if (
      option.isDefault !== undefined &&
      typeof option.isDefault !== "boolean"
    ) {
      return `isDefault của ${option.name} phải là boolean`;
    }

    if (
      option.active !== undefined &&
      typeof option.active !== "boolean"
    ) {
      return `active của ${option.name} phải là boolean`;
    }

    if (
      option.maxChars !== undefined &&
      option.maxChars !== null &&
      (!Number.isInteger(option.maxChars) || option.maxChars < 0)
    ) {
      return `maxChars của ${option.name} phải là số nguyên không âm hoặc null`;
    }
  }

  return null;
};

const validateCustomizationData = (body) => {
  if (!isPlainObject(body)) {
    return "Body phải là một object JSON";
  }

  const fields = Object.keys(body);

  if (fields.length === 0) {
    return "Vui lòng nhập dữ liệu cần cập nhật";
  }

  const unknownFields = fields.filter(
    (field) => !ALLOWED_FIELDS.includes(field)
  );

  if (unknownFields.length > 0) {
    return `Trường không hợp lệ: ${unknownFields.join(", ")}`;
  }

  for (const field of OPTION_FIELDS) {
    if (body[field] !== undefined) {
      const error = validateOptions(body[field], field);
      if (error) return error;
    }
  }

  if (body.required !== undefined) {
    if (!isPlainObject(body.required)) {
      return "required phải là một object";
    }

    const unknownRequiredFields = Object.keys(body.required).filter(
      (field) => !REQUIRED_FIELDS.includes(field)
    );

    if (unknownRequiredFields.length > 0) {
      return `Trường required không hợp lệ: ${unknownRequiredFields.join(", ")}`;
    }

    for (const field of Object.keys(body.required)) {
      if (typeof body.required[field] !== "boolean") {
        return `required.${field} phải là boolean`;
      }
    }
  }

  if (body.bannedWords !== undefined) {
    if (
      !Array.isArray(body.bannedWords) ||
      body.bannedWords.some(
        (word) => typeof word !== "string" || !word.trim()
      )
    ) {
      return "bannedWords phải là mảng các chuỗi không rỗng";
    }
  }

  return null;
};

// GET /api/admin/customization
const getAdminCustomization = async (req, res, next) => {
  try {
    const customization = await Customization.findOne().lean();

    if (!customization) {
      return res.status(404).json({
        success: false,
        message: "Chưa có cấu hình tùy biến",
      });
    }

    return res.status(200).json({
      success: true,
      data: customization,
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/admin/customization
const updateAdminCustomization = async (req, res, next) => {
  try {
    const data = req.body || {};
    const validationError = validateCustomizationData(data);

    if (validationError) {
      return res.status(400).json({
        success: false,
        message: validationError,
      });
    }

    let customization = await Customization.findOne();

    if (!customization) {
      customization = new Customization();
    }

    for (const field of OPTION_FIELDS) {
      if (data[field] !== undefined) {
        customization[field] = data[field].map((option) => ({
          name: option.name.normalize("NFC").trim(),
          priceDiff: option.priceDiff ?? 0,
          isDefault: option.isDefault ?? false,
          active: option.active ?? true,
          maxChars: option.maxChars ?? null,
        }));
      }
    }

    if (data.required !== undefined) {
      const currentRequired = customization.required
        ? customization.required.toObject
          ? customization.required.toObject()
          : customization.required
        : {};

      customization.required = {
        ...currentRequired,
        ...data.required,
      };
    }

    if (data.bannedWords !== undefined) {
      customization.bannedWords = [
        ...new Set(
          data.bannedWords.map((word) =>
            word.normalize("NFC").trim()
          )
        ),
      ];
    }

    await customization.save();

    return res.status(200).json({
      success: true,
      message: "Cập nhật cấu hình tùy biến thành công",
      data: customization,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAdminCustomization,
  updateAdminCustomization,
};
