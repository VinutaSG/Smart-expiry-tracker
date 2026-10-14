import React, { useState } from 'react';
import {
  View,
  TextInput,
  FlatList,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://10.76.60.253:5000/api';

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState(null);
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    try {
      if (!query.trim()) {
        alert('Please enter search term');
        return;
      }

      const token = await AsyncStorage.getItem('userToken');
      const response = await axios.get(`${API_URL}/products/search`, {
        params: { query, status_filter: statusFilter },
        headers: { Authorization: `Bearer ${token}` },
      });

      setResults(response.data.products);
      setSearched(true);
    } catch (error) {
      console.error('Search error:', error);
      alert('Search failed');
    }
  };

  const renderProduct = ({ item }) => {
    const statusColor = {
      expired: '#f44336',
      expiring_soon: '#ff9800',
      good: '#4CAF50',
      no_expiry: '#2196F3',
    };

    return (
      <View style={[styles.resultCard, { borderLeftColor: statusColor[item.status] }]}>
        <Text style={styles.productName}>{item.product_name}</Text>
        <Text style={styles.category}>{item.category}</Text>
        {item.expiry_type === 'no_expiry' ? (
          <Text style={styles.noExpiry}>✅ No expiry</Text>
        ) : (
          <Text style={styles.date}>EXP: {item.exp_date}</Text>
        )}
        <Text style={[styles.status, { color: statusColor[item.status] }]}>
          {item.status.toUpperCase()}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.input}
          placeholder="Search products..."
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>🔍</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal style={styles.filterContainer}>
        {[
          { label: 'All', value: null },
          { label: 'Expired', value: 'expired' },
          { label: 'Expiring', value: 'expiring_soon' },
          { label: 'Good', value: 'good' },
          { label: 'No Expiry', value: 'no_expiry' },
        ].map((filter) => (
          <TouchableOpacity
            key={filter.label}
            style={[
              styles.filterButton,
              statusFilter === filter.value && styles.filterButtonActive,
            ]}
            onPress={() => {
              setStatusFilter(filter.value);
              setSearched(false);
            }}
          >
            <Text
              style={[
                styles.filterText,
                statusFilter === filter.value && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {searched && (
        <>
          <Text style={styles.resultText}>
            {results.length} product{results.length !== 1 ? 's' : ''} found
          </Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id.toString()}
            renderItem={renderProduct}
            ListEmptyComponent={
              <Text style={styles.noResults}>No products found</Text>
            }
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: '#fff',
  },
  searchContainer: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    marginRight: 10,
    fontSize: 13,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  searchButtonText: {
    fontSize: 18,
  },
  filterContainer: {
    marginBottom: 15,
    paddingBottom: 10,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    backgroundColor: '#f9f9f9',
  },
  filterButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '600',
  },
  filterTextActive: {
    color: '#fff',
  },
  resultText: {
    marginBottom: 10,
    fontSize: 13,
    color: '#666',
  },
  resultCard: {
    backgroundColor: '#f9f9f9',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  productName: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  category: {
    fontSize: 11,
    color: '#666',
  },
  date: {
    fontSize: 11,
    color: '#333',
    marginTop: 3,
  },
  noExpiry: {
    fontSize: 11,
    color: '#2196F3',
    marginTop: 3,
    fontWeight: '600',
  },
  status: {
    fontSize: 11,
    marginTop: 5,
    fontWeight: 'bold',
  },
  noResults: {
    textAlign: 'center',
    marginTop: 20,
    color: '#999',
  },
});