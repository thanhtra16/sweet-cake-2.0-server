
/**
 * FR-A-09 Admin quản lý tài khoản khách hàng:
 * Xem danh sách / chi tiết, khóa / mở khóa.
 * Chỉ thao tác trên tài khoản có role = 'buyer'.
 */

const User = require('../models/users');
const { HttpError } = require('../utils/http-error');

const BUYER_ROLE = 'buyer';

const LIST_FIELDS =
  'fullName email phone role isLocked createdAt';

const escapeRegex = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// =====================================
// FILTER
// =====================================

function buildFilter({ search, status }) {
  const filter = {
    role: BUYER_ROLE,
  };

  if (status === 'locked') {
    filter.isLocked = true;
  } else if (status === 'active') {
    filter.isLocked = { $ne: true };
  }

  const keyword = (search || '').trim();

  if (keyword) {
    const rx = new RegExp(escapeRegex(keyword), 'i');

    filter.$or = [
      { fullName: rx },
      { email: rx },
      { phone: rx },
    ];
  }

  return filter;
}

// =====================================
// STATISTICS
// =====================================

async function summarize() {
  const startOfMonth = new Date();

  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const base = {
    role: BUYER_ROLE,
  };

  const [
    total,
    locked,
    newThisMonth,
  ] = await Promise.all([
    User.countDocuments(base),

    User.countDocuments({
      ...base,
      isLocked: true,
    }),

    User.countDocuments({
      ...base,
      createdAt: {
        $gte: startOfMonth,
      },
    }),
  ]);

  return {
    total,
    active: total - locked,
    locked,
    newThisMonth,
  };
}

// =====================================
// LIST USERS
// =====================================

async function listUsers({
  search,
  status,
  page = 1,
  limit = 10,
  sort = 'newest',
}) {
  const filter = buildFilter({
    search,
    status,
  });

  const pageNo = Math.max(
    1,
    Number(page) || 1
  );

  const size = Math.min(
    50,
    Math.max(1, Number(limit) || 10)
  );

  let sortOption = {
    createdAt: -1,
  };

  if (sort === 'oldest') {
    sortOption = {
      createdAt: 1,
    };
  } else if (sort === 'name') {
    sortOption = {
      fullName: 1,
    };
  }

  const [
    items,
    total,
    stats,
  ] = await Promise.all([
    User.find(filter)
      .select(LIST_FIELDS)
      .sort(sortOption)
      .skip((pageNo - 1) * size)
      .limit(size)
      .lean(),

    User.countDocuments(filter),

    summarize(),
  ]);

  return {
    items: items.map((user) => ({
      ...user,
      id: String(user._id),
      isLocked: user.isLocked === true,
    })),

    pagination: {
      page: pageNo,
      limit: size,
      total,
      totalPages: Math.max(
        1,
        Math.ceil(total / size)
      ),
    },

    stats,
  };
}

// =====================================
// GET USER DETAIL
// =====================================

async function getUser(id) {
  const user = await User.findOne({
    _id: id,
    role: BUYER_ROLE,
  })
    .select(LIST_FIELDS)
    .lean();

  if (!user) {
    throw new HttpError(
      404,
      'Không tìm thấy khách hàng.',
      'USER_NOT_FOUND'
    );
  }

  return {
    ...user,
    id: String(user._id),
    isLocked: user.isLocked === true,
  };
}

// =====================================
// UPDATE USER STATUS
// =====================================

async function setStatus(
  id,
  status,
  reason,
  adminId
) {
  if (!['active', 'locked'].includes(status)) {
    throw new HttpError(
      400,
      'Trạng thái tài khoản không hợp lệ.',
      'INVALID_USER_STATUS'
    );
  }

  if (String(id) === String(adminId)) {
    throw new HttpError(
      400,
      'Bạn không thể tự khóa tài khoản của mình.',
      'SELF_LOCK'
    );
  }

  const user = await User.findOne({
    _id: id,
    role: BUYER_ROLE,
  });

  if (!user) {
    throw new HttpError(
      404,
      'Không tìm thấy khách hàng.',
      'USER_NOT_FOUND'
    );
  }

  const isLocked = status === 'locked';

  if (user.isLocked !== isLocked) {
    await User.updateOne(
      {
        _id: user._id,
        role: BUYER_ROLE,
      },
      {
        $set: {
          isLocked,
        },
      }
    );
  }

  return getUser(id);
}

module.exports = {
  listUsers,
  getUser,
  setStatus,
};
