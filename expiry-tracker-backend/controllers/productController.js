const pool = require('../config/database');

exports.addProduct = async (req, res) => {
  try {
    const { 
      product_name, 
      category, 
      mfg_date, 
      exp_date,
      expiry_type,
      shelf_life_months
    } = req.body;
    const user_id = req.userId;
    const image_url = req.file ? req.file.path : null;

    const connection = await pool.getConnection();

    let finalExpDate = exp_date;
    let finalExpiryType = expiry_type || 'fixed_date';
    let finalShelfLife = shelf_life_months;

    if (finalExpiryType === 'months_after_mfg' && mfg_date && shelf_life_months) {
      finalExpDate = calculateExpiryDate(mfg_date, shelf_life_months);
    }

    let status = 'good';
    if (finalExpiryType === 'no_expiry') {
      status = 'no_expiry';
    } else if (finalExpDate) {
      const expiryDate = new Date(finalExpDate);
      const today = new Date();
      const daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      if (daysUntilExpiry <= 0) status = 'expired';
      else if (daysUntilExpiry <= 10) status = 'expiring_soon';
    }

    const [result] = await connection.execute(
      `INSERT INTO products 
       (user_id, product_name, category, mfg_date, exp_date, expiry_type, shelf_life_months, image_url, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [user_id, product_name, category, mfg_date, finalExpDate, finalExpiryType, finalShelfLife, image_url, status]
    );

    if (status === 'expiring_soon') {
      const expiryDate = new Date(finalExpDate);
      const today = new Date();
      const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

      await connection.execute(
        'INSERT INTO notifications (user_id, product_id, message, type) VALUES (?, ?, ?, ?)',
        [user_id, result.insertId, `${product_name} expires in ${daysLeft} days!`, 'expiring_soon']
      );
    }

    connection.release();

    res.status(201).json({
      success: true,
      product_id: result.insertId,
      status,
      expiry_type: finalExpiryType,
      shelf_life_months: finalShelfLife,
      expiry_date: finalExpDate
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error adding product' });
  }
};

exports.getUserInventory = async (req, res) => {
  try {
    const user_id = req.userId;
    const connection = await pool.getConnection();

    const [products] = await connection.execute(
      'SELECT * FROM products WHERE user_id = ? ORDER BY exp_date ASC',
      [user_id]
    );

    const enrichedProducts = products.map(product => {
      let daysUntilExpiry = null;
      let statusMessage = '';

      if (product.expiry_type === 'no_expiry') {
        statusMessage = '✅ No expiry date';
      } else if (product.exp_date) {
        const expiryDate = new Date(product.exp_date);
        const today = new Date();
        daysUntilExpiry = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        if (daysUntilExpiry <= 0) {
          statusMessage = '⚠️ EXPIRED';
        } else if (daysUntilExpiry <= 10) {
          statusMessage = `🔔 EXPIRING IN ${daysUntilExpiry} DAYS`;
        } else {
          statusMessage = `✅ ${daysUntilExpiry} days remaining`;
        }
      }

      return {
        ...product,
        days_until_expiry: daysUntilExpiry,
        status_message: statusMessage
      };
    });

    connection.release();

    const grouped = {
      expired: enrichedProducts.filter(p => p.status === 'expired'),
      expiring_soon: enrichedProducts.filter(p => p.status === 'expiring_soon'),
      good: enrichedProducts.filter(p => p.status === 'good'),
      no_expiry: enrichedProducts.filter(p => p.status === 'no_expiry')
    };

    res.json({
      success: true,
      products: enrichedProducts,
      grouped,
      summary: {
        total: products.length,
        expired: grouped.expired.length,
        expiring_soon: grouped.expiring_soon.length,
        good: grouped.good.length,
        no_expiry: grouped.no_expiry.length
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error fetching inventory' });
  }
};

exports.searchProducts = async (req, res) => {
  try {
    const { query, status_filter } = req.query;
    const user_id = req.userId;
    const connection = await pool.getConnection();

    let sqlQuery = 'SELECT * FROM products WHERE user_id = ? AND (product_name LIKE ? OR category LIKE ?)';
    const params = [user_id, `%${query}%`, `%${query}%`];

    if (status_filter) {
      sqlQuery += ' AND status = ?';
      params.push(status_filter);
    }

    sqlQuery += ' ORDER BY exp_date ASC';

    const [products] = await connection.execute(sqlQuery, params);
    connection.release();

    res.json({
      success: true,
      found: products.length > 0,
      count: products.length,
      products
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error searching products' });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const user_id = req.userId;
    const connection = await pool.getConnection();

    await connection.execute(
      'DELETE FROM products WHERE id = ? AND user_id = ?',
      [id, user_id]
    );

    connection.release();

    res.json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting product' });
  }
};

function calculateExpiryDate(mfgDate, monthsToAdd) {
  if (!monthsToAdd || monthsToAdd < 1) {
    return null;
  }

  const date = new Date(mfgDate);
  date.setMonth(date.getMonth() + monthsToAdd);
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}