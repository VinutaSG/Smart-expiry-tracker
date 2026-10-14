const pool = require('../config/database');

exports.getSpendingSummary = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [orders] = await connection.execute(
      `SELECT 
        COALESCE(SUM(total), 0) as total_spent,
        COUNT(*) as order_count
       FROM products 
       WHERE user_id = ? 
       AND MONTH(exp_date) = MONTH(CURDATE())
       AND YEAR(exp_date) = YEAR(CURDATE())`,
      [req.userId]
    );

    const [users] = await connection.execute(
      'SELECT monthly_budget FROM users WHERE id = ?',
      [req.userId]
    );

    connection.release();

    const totalSpent = parseFloat(orders[0].total_spent) || 0;
    const monthlyBudget = users[0].monthly_budget;
    const remaining = monthlyBudget - totalSpent;
    const percentSpent = ((totalSpent / monthlyBudget) * 100).toFixed(2);

    res.json({
      total_spent: totalSpent,
      monthly_budget: monthlyBudget,
      remaining,
      percent_spent: percentSpent,
      order_count: orders[0].order_count
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching summary' });
  }
};

exports.getSpendingByCategory = async (req, res) => {
  try {
    const connection = await pool.getConnection();

    const [data] = await connection.execute(
      `SELECT 
        category,
        COUNT(*) as count
       FROM products
       WHERE user_id = ?
       AND MONTH(exp_date) = MONTH(CURDATE())
       GROUP BY category
       ORDER BY count DESC`,
      [req.userId]
    );

    connection.release();
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching spending by category' });
  }
};

exports.getTransactionHistory = async (req, res) => {
  try {
    const { limit = 20, offset = 0 } = req.query;
    const connection = await pool.getConnection();

    const [transactions] = await connection.execute(
      `SELECT 
        id,
        product_name,
        category,
        exp_date,
        status,
        created_at
       FROM products
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [req.userId, parseInt(limit), parseInt(offset)]
    );

    connection.release();
    res.json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching history' });
  }
};