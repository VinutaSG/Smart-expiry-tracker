import React, { useState, useRef } from 'react';
import {
  View,
  Image,
  Text,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_URL = 'http://localhost:5000/api';

export default function ScanScreen({ navigation }) {
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [formData, setFormData] = useState({
    product_name: '',
    category: 'Food Items',
    mfg_date: '',
    exp_date: '',
    shelf_life_months: '',
    expiry_type: 'fixed_date',
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
      extractDatesFromImage(result.assets[0].uri);
    }
  };

  const extractDatesFromImage = async (uri) => {
    try {
      setLoading(true);

      // Convert URI to blob
      const response = await fetch(uri);
      const blob = await response.blob();

      const formDataObj = new FormData();
      formDataObj.append('image', blob, 'product.jpg');

      // Send to Python OCR backend
      const ocrResponse = await axios.post(`${API_URL}/ocr/extract`, formDataObj, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setExtractedData(ocrResponse.data);

      // Auto-fill form with extracted data
      setFormData({
        ...formData,
        mfg_date: ocrResponse.data.mfg_date || '',
        exp_date: ocrResponse.data.exp_date || '',
        shelf_life_months: ocrResponse.data.shelf_life_months ? String(ocrResponse.data.shelf_life_months) : '',
        expiry_type: ocrResponse.data.expiry_type || 'fixed_date',
      });

      setLoading(false);
    } catch (error) {
      console.error('OCR Error:', error);
      setLoading(false);
      Alert.alert('OCR Error', 'Could not read dates from image');
    }
  };

  const handleAddProduct = async () => {
    if (!formData.product_name.trim()) {
      Alert.alert('Error', 'Enter product name');
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('userToken');

      const submitData = {
        ...formData,
        shelf_life_months: formData.shelf_life_months ? parseInt(formData.shelf_life_months) : null,
      };

      await axios.post(`${API_URL}/products/add`, submitData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Product added!');
      setImage(null);
      setExtractedData(null);
      setFormData({
        product_name: '',
        category: 'Food Items',
        mfg_date: '',
        exp_date: '',
        shelf_life_months: '',
        expiry_type: 'fixed_date',
      });
      setLoading(false);
      navigation.navigate('Inventory');
    } catch (error) {
      setLoading(false);
      Alert.alert('Error', 'Failed to add product');
    }
  };

  if (!image) {
    return (
      <View style={styles.container}>
        <View style={styles.uploadContainer}>
          <Text style={styles.title}>📸 Scan Product</Text>
          <Text style={styles.subtitle}>Upload image to auto-detect dates</Text>
          
          <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
            <Text style={styles.uploadText}>📷 Pick Image</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Image source={{ uri: image }} style={styles.previewImage} />

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
          <Text style={styles.loadingText}>🤖 Reading product label...</Text>
        </View>
      )}

      {extractedData && (
        <View style={styles.detectedContainer}>
          <Text style={styles.detectedTitle}>✅ Detected Information</Text>
          <Text style={styles.detectedText}>MFG: {extractedData.mfg_date || 'Not found'}</Text>
          <Text style={styles.detectedText}>EXP: {extractedData.exp_date || 'Not found'}</Text>
          {extractedData.shelf_life_months && (
            <Text style={styles.detectedText}>Shelf Life: {extractedData.shelf_life_months} months</Text>
          )}
          {extractedData.suggestions && extractedData.suggestions.map((s, i) => (
            <Text key={i} style={styles.suggestionText}>💡 {s}</Text>
          ))}
        </View>
      )}

      <View style={styles.formContainer}>
        <Text style={styles.sectionTitle}>📝 Verify & Edit</Text>

        <Text style={styles.label}>Product Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Milk"
          value={formData.product_name}
          onChangeText={(text) => setFormData({ ...formData, product_name: text })}
        />

        <Text style={styles.label}>Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Dairy"
          value={formData.category}
          onChangeText={(text) => setFormData({ ...formData, category: text })}
        />

        <Text style={styles.label}>Manufacturing Date</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={formData.mfg_date}
          onChangeText={(text) => setFormData({ ...formData, mfg_date: text })}
        />

        <Text style={styles.label}>Expiry Type</Text>
        <View style={styles.buttonGroup}>
          {['fixed_date', 'months_after_mfg', 'no_expiry'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.typeButton,
                formData.expiry_type === type && styles.typeButtonActive,
              ]}
              onPress={() => setFormData({ ...formData, expiry_type: type })}
            >
              <Text style={styles.typeButtonText}>
                {type === 'fixed_date' && '📅'}
                {type === 'months_after_mfg' && '⏰'}
                {type === 'no_expiry' && '✅'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {formData.expiry_type === 'fixed_date' && (
          <>
            <Text style={styles.label}>Expiry Date</Text>
            <TextInput
              style={styles.input}
              placeholder="YYYY-MM-DD"
              value={formData.exp_date}
              onChangeText={(text) => setFormData({ ...formData, exp_date: text })}
            />
          </>
        )}

        {formData.expiry_type === 'months_after_mfg' && (
          <>
            <Text style={styles.label}>Shelf Life (Months)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., 18"
              value={formData.shelf_life_months}
              onChangeText={(text) => setFormData({ ...formData, shelf_life_months: text })}
              keyboardType="numeric"
            />
          </>
        )}

        <TouchableOpacity 
          style={[styles.button, styles.addButton]} 
          onPress={handleAddProduct}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Adding...' : '✅ Add Product'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={() => {
            setImage(null);
            setExtractedData(null);
          }}
        >
          <Text style={styles.cancelButtonText}>🔄 Scan Again</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  uploadContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  uploadButton: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    width: '80%',
    alignItems: 'center',
  },
  uploadText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  previewImage: {
    width: '100%',
    height: 250,
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  detectedContainer: {
    backgroundColor: '#e8f5e9',
    margin: 10,
    padding: 15,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
  },
  detectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#2e7d32',
  },
  detectedText: {
    fontSize: 13,
    color: '#333',
    marginBottom: 5,
  },
  suggestionText: {
    fontSize: 12,
    color: '#0066cc',
    marginTop: 5,
    fontStyle: 'italic',
  },
  formContainer: {
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 10,
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
    marginBottom: 10,
  },
  buttonGroup: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  typeButton: {
    flex: 1,
    padding: 8,
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  typeButtonText: {
    fontSize: 18,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  addButton: {
    backgroundColor: '#4CAF50',
  },
  cancelButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: '#333',
    fontWeight: 'bold',
  },
});