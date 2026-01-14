'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, X, User, Building2, MapPin, Mail, Phone, FileText, AlertCircle, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toast } from '@/lib/toast';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocomplete from '@/components/ui/address-autocomplete';

// Interface para dados de endereço (importada do componente AddressAutocomplete)
interface AddressData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  latitude: number;
  longitude: number;
  number?: string;
  neighborhood?: string;
}

interface FormData {
  document: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  number?: string;
  neighborhood?: string;
  city: string;
  state: string;
  zipCode: string;
  complement: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  clientType: string;
}

interface FormErrors {
  document?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  clientType?: string;
}

export default function NewClientPage() {
  const router = useRouter();
  const [returnTo, setReturnTo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddressDetails, setShowAddressDetails] = useState(true);
  const [formData, setFormData] = useState<FormData>({
    document: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    number: '',
    neighborhood: '',
    city: '',
    state: '',
    zipCode: '',
    complement: '',
    country: 'Brasil',
    latitude: null,
    longitude: null,
    clientType: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj' | null>(null);

  useEffect(() => {
    try {
      const sp = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const prefillName = sp.get('prefillName');
      const rt = sp.get('return');
      if (prefillName) {
        setFormData(prev => ({ ...prev, name: prefillName }));
      }
      if (rt) setReturnTo(rt);
    } catch {}
  }, []);

  // Validação de CPF
  const validateCPF = (cpf: string): boolean => {
    cpf = cpf.replace(/[^\d]/g, '');
    if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      sum += parseInt(cpf.charAt(i)) * (10 - i);
    }
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cpf.charAt(9))) return false;
    
    sum = 0;
    for (let i = 0; i < 10; i++) {
      sum += parseInt(cpf.charAt(i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cpf.charAt(10));
  };

  // Validação de CNPJ
  const validateCNPJ = (cnpj: string): boolean => {
    cnpj = cnpj.replace(/[^\d]/g, '');
    if (cnpj.length !== 14) return false;
    
    // Verifica se todos os dígitos são iguais
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    // Validação do primeiro dígito verificador
    let sum = 0;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;
    
    // Validação do segundo dígito verificador
    sum = 0;
    const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = 0; i < 13; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights2[i];
    }
    
    remainder = sum % 11;
    const digit2 = remainder < 2 ? 0 : 11 - remainder;
    
    return digit2 === parseInt(cnpj.charAt(13));
  };

  // Máscara para CPF/CNPJ
  const formatDocument = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    
    if (numbers.length <= 11) {
      setDocumentType('cpf');
      return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else {
      setDocumentType('cnpj');
      return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
  };

  // Máscara para telefone
  const formatPhone = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    if (numbers.length <= 10) {
      return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    } else {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    }
  };

  // Máscara para CEP
  const formatZipCode = (value: string): string => {
    const numbers = value.replace(/[^\d]/g, '');
    return numbers.replace(/(\d{5})(\d{3})/, '$1-$2');
  };

  // Validação de email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Validação em tempo real
  const validateField = (name: string, value: string): string | undefined => {
    switch (name) {
      case 'document':
        const cleanDoc = value.replace(/[^\d]/g, '');
        if (!value) return 'CPF ou CNPJ é obrigatório';
        if (cleanDoc.length <= 11) {
          if (cleanDoc.length === 11 && !validateCPF(cleanDoc)) {
            return 'CPF inválido';
          }
        } else {
          if (cleanDoc.length === 14 && !validateCNPJ(cleanDoc)) {
            return 'CNPJ inválido';
          }
        }
        if (cleanDoc.length !== 11 && cleanDoc.length !== 14) {
          return 'Documento deve ter 11 (CPF) ou 14 (CNPJ) dígitos';
        }
        break;
      case 'name':
        if (!value) return documentType === 'cpf' ? 'Nome completo é obrigatório' : 'Razão social é obrigatória';
        if (value.length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        break;
      case 'email':
        if (!value) return 'Email é obrigatório';
        if (!validateEmail(value)) return 'Email inválido';
        break;
      case 'phone':
        if (!value) return 'Telefone é obrigatório';
        const cleanPhone = value.replace(/[^\d]/g, '');
        if (cleanPhone.length < 10 || cleanPhone.length > 11) {
          return 'Telefone deve ter 10 ou 11 dígitos';
        }
        break;
      case 'address':
        if (!value) return 'Endereço é obrigatório';
        if (value.trim().length < 5) return 'Endereço deve ter pelo menos 5 caracteres';
        break;
      case 'city':
        if (!value) return 'Cidade é obrigatória';
        break;
      case 'state':
        if (!value) return 'Estado é obrigatório';
        if (value.length < 2) return 'Estado deve ter pelo menos 2 caracteres';
        break;
      case 'zipCode':
        if (!value) return 'CEP é obrigatório';
        const cleanZip = value.replace(/[^\d]/g, '');
        if (cleanZip.length !== 8) return 'CEP deve ter 8 dígitos';
        break;
      case 'clientType':
        if (!value) return 'Tipo de Cliente é obrigatório';
        break;
    }
    return undefined;
  };

  // Handle address selection from autocomplete
  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address || '',
      number: addressData.number || '',
      neighborhood: addressData.neighborhood || '',
      city: addressData.city || '',
      state: addressData.state || '',
      zipCode: addressData.zipCode || '',
      country: addressData.country || 'Brasil',
      latitude: addressData.latitude || null,
      longitude: addressData.longitude || null
    }));

    // Clear address-related errors
    setErrors(prev => ({
      ...prev,
      address: undefined,
      city: undefined,
      state: undefined,
      zipCode: undefined
    }));

    // Mostrar campos de endereço somente após seleção no autocomplete
    setShowAddressDetails(true);
  };

  // Handle input change
  const handleInputChange = (name: string, value: string) => {
    let formattedValue = value;

    // Aplicar máscaras
    if (name === 'document') {
      formattedValue = formatDocument(value);
    } else if (name === 'phone') {
      formattedValue = formatPhone(value);
    } else if (name === 'zipCode') {
      formattedValue = formatZipCode(value);
    }

    setFormData(prev => ({ ...prev, [name]: formattedValue }));

    // Validação em tempo real
    const error = validateField(name, formattedValue);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  // Validar formulário completo
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    Object.keys(formData).forEach(key => {
      if (key !== 'complement' && key !== 'number' && key !== 'neighborhood' && key !== 'latitude' && key !== 'longitude' && key !== 'country') { // campos opcionais
        const value = formData[key as keyof FormData];
        const error = validateField(key, String(value || ''));
        if (error) newErrors[key as keyof FormErrors] = error;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      Toast.error('Por favor, corrija os campos destacados.');
      return;
    }

    setIsLoading(true);

    try {
      const cleanedPhone = formData.phone.replace(/[^\d]/g, '');
      if (cleanedPhone.length < 10 || cleanedPhone.length > 11) {
        setErrors(prev => ({ ...prev, phone: 'Telefone inválido' }));
        Toast.error('Telefone inválido. Informe DDD + número.');
        setIsLoading(false);
        return;
      }
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          document: formData.document.replace(/[^\d]/g, ''),
          name: formData.name,
          email: formData.email,
          phone: cleanedPhone,
          address: `${formData.address}${formData.number ? `, nº ${formData.number}` : ''}${formData.neighborhood ? ` - ${formData.neighborhood}` : ''}`,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode.replace(/[^\d]/g, ''),
          complement: formData.complement,
          country: formData.country,
          latitude: formData.latitude,
          longitude: formData.longitude,
          clientType: formData.clientType,
        }),
      });

      if (response.ok) {
        const data: any = await response.json();
        const created = data.client;
        Toast.success('Cliente criado com sucesso!');
        if (returnTo) {
          const url = new URL(returnTo, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');
          url.searchParams.set('clientId', created.id);
          router.push(url.pathname + url.search);
        } else {
          router.push('/dashboard/clients?success=created');
        }
      } else {
        const errorData: any = await response.json().catch(() => ({ error: 'Erro ao salvar cliente' }));
        const msg = String(errorData?.error || 'Erro ao salvar cliente');
        if (msg.includes('Cliente já existe')) {
          setErrors(prev => ({ ...prev, email: 'Este email já está cadastrado', document: 'Este documento já está cadastrado' }));
          Toast.error('Cliente já existe com este email ou documento');
        } else if (msg === 'Dados inválidos' && Array.isArray(errorData?.details)) {
          const fieldErrors: Record<string, string> = {};
          for (const issue of errorData.details) {
            const key = Array.isArray(issue.path) ? issue.path[0] : issue.path;
            if (key) fieldErrors[String(key)] = issue.message || 'Inválido';
          }
          setErrors(prev => ({ ...prev, ...fieldErrors }));
          Toast.error('Por favor, corrija os campos inválidos.');
        } else {
          Toast.error(msg);
        }
      }
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
      Toast.apiError(error, 'Erro ao salvar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push('/dashboard/clients')}
                className="flex items-center space-x-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Voltar</span>
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Novo Cliente</h1>
                <p className="text-gray-600 dark:text-gray-400">Cadastre um novo cliente no sistema</p>
              </div>
            </div>
          </div>
        </div>

        {/* Messages */}
        {successMessage && (
          <div className="mx-6 mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <p className="text-green-800 dark:text-green-200">{successMessage}</p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Documento */}
            <div className="space-y-2">
              <Label htmlFor="document" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <FileText className="h-4 w-4" />
                <span>CPF/CNPJ *</span>
              </Label>
              <Input
                id="document"
                type="text"
                value={formData.document}
                onChange={(e) => handleInputChange('document', e.target.value)}
                placeholder={documentType === 'cpf' ? '000.000.000-00' : '00.000.000/0000-00'}
                className={`${errors.document ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                maxLength={18}
              />
              {errors.document && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.document}</p>
              )}
            </div>

            {/* Tipo de Cliente */}
            <div className="space-y-2">
              <Label htmlFor="clientType" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Building2 className="h-4 w-4" />
                <span>Tipo de Cliente *</span>
              </Label>
              <Select value={formData.clientType} onValueChange={(value) => handleInputChange('clientType', value)}>
                <SelectTrigger className={`${errors.clientType ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}>
                  <SelectValue placeholder="Selecione o tipo de cliente" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600">
                  <SelectItem value="Bueno" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Bueno</SelectItem>
                  <SelectItem value="Malo" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Malo</SelectItem>
                  <SelectItem value="Muy Malo" className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-600">Muy Malo</SelectItem>
                </SelectContent>
              </Select>
              {errors.clientType && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.clientType}</p>
              )}
            </div>

            {/* Nome */}
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <User className="h-4 w-4" />
                <span>Nome Completo *</span>
              </Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Nome completo do cliente"
                className={`${errors.name ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
              />
              {errors.name && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Mail className="h-4 w-4" />
                <span>Email *</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className={`${errors.email ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
              />
              {errors.email && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Telefone */}
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                <Phone className="h-4 w-4" />
                <span>Telefone *</span>
              </Label>
                <Input
                  id="phone"
                  type="text"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  className={`${errors.phone ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 h-11 text-base`}
                  maxLength={15}
                />
              {errors.phone && (
                <p className="text-sm text-red-600 dark:text-red-400">{errors.phone}</p>
              )}
            </div>
          </div>

          {/* Seção de Endereço */}
          <div className="bg-card/50 dark:bg-card/30 backdrop-blur-sm border border-border/50 dark:border-border/30 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            

            <div className="space-y-6">
              {/* Autocompletar Endereço */}
              <div className="space-y-2">
                <Label htmlFor="address-input" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                  <MapPin className="h-4 w-4" />
                  <span>Endereço *</span>
                </Label>
                <AddressAutocomplete
                  onAddressSelect={handleAddressSelect}
                  placeholder="Digite o endereço para buscar..."
                  hideLabel
                />
              </div>

              {/* Botões (posicionados logo abaixo do dropdown de endereço) */}
              <div className="flex justify-end space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={isLoading}
                  className="px-6 py-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    'Salvar Cliente'
                  )}
                </Button>
              </div>

              {showAddressDetails && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Endereço */}
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="address" className="flex items-center space-x-2 text-gray-700 dark:text-gray-300">
                      <MapPin className="h-4 w-4" />
                      <span>Endereço *</span>
                    </Label>
                    <Input
                      id="address"
                      type="text"
                      value={formData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="Rua, Avenida..."
                      className={`${errors.address ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    />
                    {errors.address && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.address}</p>
                    )}
                  </div>

                  {/* Número */}
                  <div className="space-y-2">
                    <Label htmlFor="number" className="text-gray-700 dark:text-gray-300">
                      Número
                    </Label>
                    <Input
                      id="number"
                      type="text"
                      value={formData.number || ''}
                      onChange={(e) => handleInputChange('number', e.target.value)}
                      placeholder="123"
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  {/* CEP */}
                  <div className="space-y-2">
                    <Label htmlFor="zipCode" className="text-gray-700 dark:text-gray-300">
                      CEP *
                    </Label>
                    <Input
                      id="zipCode"
                      type="text"
                      value={formData.zipCode}
                      onChange={(e) => handleInputChange('zipCode', e.target.value)}
                      placeholder="00000-000"
                      className={`${errors.zipCode ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                      maxLength={9}
                    />
                    {errors.zipCode && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.zipCode}</p>
                    )}
                  </div>

                  {/* Cidade */}
                  <div className="space-y-2">
                    <Label htmlFor="city" className="text-gray-700 dark:text-gray-300">
                      Cidade *
                    </Label>
                    <Input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      placeholder="São Paulo"
                      className={`${errors.city ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    />
                    {errors.city && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                    )}
                  </div>

                  {/* Estado */}
                  <div className="space-y-2">
                    <Label htmlFor="state" className="text-gray-700 dark:text-gray-300">
                      Estado *
                    </Label>
                    <Input
                      id="state"
                      type="text"
                      value={formData.state}
                      onChange={(e) => handleInputChange('state', e.target.value)}
                      placeholder="SP"
                      className={`${errors.state ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                    />
                    {errors.state && (
                      <p className="text-sm text-red-600 dark:text-red-400">{errors.state}</p>
                    )}
                  </div>

                  {/* Bairro */}
                  <div className="space-y-2">
                    <Label htmlFor="neighborhood" className="text-gray-700 dark:text-gray-300">
                      Bairro
                    </Label>
                    <Input
                      id="neighborhood"
                      type="text"
                      value={formData.neighborhood || ''}
                      onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                      placeholder="Centro"
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  {/* Complemento */}
                  <div className="space-y-2">
                    <Label htmlFor="complement" className="text-gray-700 dark:text-gray-300">
                      Complemento
                    </Label>
                    <Input
                      id="complement"
                      type="text"
                      value={formData.complement}
                      onChange={(e) => handleInputChange('complement', e.target.value)}
                      placeholder="Apto 123"
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>

                  {/* País */}
                  <div className="space-y-2">
                    <Label htmlFor="country" className="text-gray-700 dark:text-gray-300">
                      País
                    </Label>
                    <Input
                      id="country"
                      type="text"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      placeholder="Brasil"
                      className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}
