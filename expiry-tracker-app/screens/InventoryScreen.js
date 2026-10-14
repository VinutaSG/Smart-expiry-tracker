import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
  SectionList,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:5000/api';

export default function InventoryScreen() {
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/products/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setInventory(response.data);
      setLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setLoading(false);
    }
  };

  const deleteProduct = (id) => {
    Alert.alert('Delete', 'Delete this product?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            const token = await AsyncStorage.getItem('userToken');
            await axios.delete(`${API_URL}/products/${id}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            fetchInventory();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  const renderProduct = ({ item }) => {
    const getStatusColor = () => {
      if (item.status === 'expired') return '#f44336';
      if (item.status === 'expiring_soon') return '#ff9800';
      if (item.status === 'no_expiry') return '#2196F3';
      return '#4CAF50';
    };

    return (
      <View style={[styles.productCard, { borderLeftColor: getStatusColor() }]}>
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{item.product_name}</Text>
          <Text style={styles.category}>{item.category}</Text>
          {item.expiry_type === 'no_expiry' ? (
            <Text style={styles.noExpiryText}>✅ No expiry</Text>
          ) : (
            <>
              <Text style={styles.date}>MFG: {item.mfg_date || 'N/A'}</Text>
              <Text style={styles.date}>EXP: {item.exp_date || 'N/A'}</Text>
            </>
          )}
          <Text style={[styles.statusMessage]}>{item.status_message}</Text>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteProduct(item.id)}
        >
          <Text style={styles.deleteText}>🗑️</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (!inventory) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  const sections = [
    {
      title: `⚠️ EXPIRED (${inventory.summary.expired})`,
      data: inventory.grouped.expired,
      color: '#f44336',
    },
    {
      title: `🔔 EXPIRING SOON (${inventory.summary.expiring_soon})`,
      data: inventory.grouped.expiring_soon,
      color: '#ff9800',
    },
    {
      title: `✅ GOOD (${inventory.summary.good})`,
      data: inventory.grouped.good,
      color: '#4CAF50',
    },
    {
      title: `ℹ️ NO EXPIRY (${inventory.summary.no_expiry})`,
      data: inventory.grouped.no_expiry,
      color: '#2196F3',
    },
  ].filter(section => section.data.length > 0);

  return (
    <View style={styles.container}>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryNumber}>{inventory.summary.total}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#f44336' }]}>
            {inventory.summary.expired}
          </Text>
          <Text style={styles.summaryLabel}>Expired</Text>
        </View>
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryNumber, { color: '#ff9800' }]}>
            {inventory.summary.expiring_soon}
          </Text>
          <Text style={styles.summaryLabel}>Expiring</Text>
        </View>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => renderProduct({ item })}
        renderSectionHeader={({ section: { title, color } }) => (
          <Text style={[styles.sectionHeader, { color }]}>{title}</Text>
        )}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={fetchInventory} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  summaryContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  summaryItem: {
    alignItems: 'center',
  },
  summaryNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginTop: 3,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: 'bold',
    padding: 10,
    backgroundColor: '#f9f9f9',
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    padding: 12,
    marginHorizontal: 10,
    marginVertical: 4,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  category: {
    fontSize: 11,
    color: '#666',
    marginBottom: 5,
  },
  date: {
    fontSize: 11,
    color: '#333',
    marginBottom: 2,
  },
  noExpiryText: {
    fontSize: 11,
    color: '#2196F3',
    fontWeight: '600',
    marginVertical: 3,
  },
  statusMessage: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 5,
    color: '#333',
  },
  deleteButton: {
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  deleteText: {
    fontSize: 18,
  },
});