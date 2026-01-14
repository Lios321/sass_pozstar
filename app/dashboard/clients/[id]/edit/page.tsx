'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Save, X, User, Building2, MapPin, Mail, Phone, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AddressAutocomplete, { AddressData } from '@/components/ui/address-autocomplete';

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

interface Client {
  id: string;
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
  complement?: string;
  country: string;
  latitude?: number | null;
  longitude?: number | null;
  clientType?: string;
}

export default function EditClientPage() {
  const router = useRouter();
  const params = useParams();
  const clientId = params.id as string;
  
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showAddressDetails, setShowAddressDetails] = useState(false);
  
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
    clientType: ''
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [documentType, setDocumentType] = useState<'cpf' | 'cnpj' | null>(null);

  // Carregar dados do cliente
  useEffect(() => {
    const loadClientData = async () => {
      try {
        setIsLoadingData(true);
        const response = await fetch(`/api/clients/${clientId}`);

        if (!response.ok) {
          throw new Error('Erro ao carregar dados do cliente');
        }

        const data: any = await response.json();
        const client: Client = data.client;

        setFormData({
          document: client.document || '',
          name: client.name || '',
          email: client.email || '',
          phone: client.phone || '',
          address: client.address || '',
          number: client.number || '',
          neighborhood: client.neighborhood || '',
          city: client.city || '',
          state: client.state || '',
          zipCode: client.zipCode || '',
          complement: client.complement || '',
          country: client.country || 'Brasil',
          latitude: client.latitude || null,
          longitude: client.longitude || null,
          clientType: client.clientType || ''
        });

        // Mostrar campos de endereço se já existir dados do cliente
        const hasAddressData = Boolean(
          client.address || client.city || client.state || client.zipCode || client.number || client.neighborhood || client.complement
        );
        setShowAddressDetails(hasAddressData);

        // Detectar tipo de documento
        const cleanDoc = client.document?.replace(/[^\d]/g, '') || '';
        if (cleanDoc.length <= 11) {
          setDocumentType('cpf');
        } else {
          setDocumentType('cnpj');
        }

      } catch (error) {
        console.error('Erro ao carregar cliente:', error);
        setErrorMessage('Erro ao carregar dados do cliente');
      } finally {
        setIsLoadingData(false);
      }
    };

    if (clientId) {
      loadClientData();
    }
  }, [clientId]);

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
    
    if (/^(\d)\1{13}$/.test(cnpj)) return false;
    
    let sum = 0;
    const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    
    for (let i = 0; i < 12; i++) {
      sum += parseInt(cnpj.charAt(i)) * weights1[i];
    }
    
    let remainder = sum % 11;
    const digit1 = remainder < 2 ? 0 : 11 - remainder;
    
    if (digit1 !== parseInt(cnpj.charAt(12))) return false;
    
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

  // Validação de campo individual
  const validateField = (field: string, value: string): string => {
    switch (field) {
      case 'document':
        if (!value.trim()) return 'Documento é obrigatório';
        const cleanDoc = value.replace(/[^\d]/g, '');
        if (cleanDoc.length <= 11) {
          if (!validateCPF(cleanDoc)) return 'CPF inválido';
        } else {
          if (!validateCNPJ(cleanDoc)) return 'CNPJ inválido';
        }
        return '';
      case 'name':
        if (!value.trim()) return 'Nome é obrigatório';
        if (value.trim().length < 2) return 'Nome deve ter pelo menos 2 caracteres';
        return '';
      case 'email':
        if (!value.trim()) return 'Email é obrigatório';
        if (!validateEmail(value)) return 'Email inválido';
        return '';
      case 'phone':
        if (!value.trim()) return 'Telefone é obrigatório';
        const cleanPhone = value.replace(/[^\d]/g, '');
        if (cleanPhone.length < 10) return 'Telefone deve ter pelo menos 10 dígitos';
        return '';
      case 'address':
        if (!value.trim()) return 'Endereço é obrigatório';
        if (value.trim().length < 5) return 'Endereço deve ter pelo menos 5 caracteres';
        return '';
      case 'city':
        if (!value.trim()) return 'Cidade é obrigatória';
        return '';
      case 'state':
        if (!value.trim()) return 'Estado é obrigatório';
        if (value.length < 2) return 'Estado deve ter pelo menos 2 caracteres';
        return '';
      case 'zipCode':
        if (!value.trim()) return 'CEP é obrigatório';
        const cleanZip = value.replace(/[^\d]/g, '');
        if (cleanZip.length !== 8) return 'CEP deve ter 8 dígitos';
        return '';
      case 'clientType':
        if (!value.trim()) return 'Tipo de Cliente é obrigatório';
        return '';
      default:
        return '';
    }
  };

  // Validação do formulário
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    let isValid = true;

    Object.keys(formData).forEach((key) => {
      if (key !== 'complement' && key !== 'latitude' && key !== 'longitude' && key !== 'number' && key !== 'neighborhood' && key !== 'country') {
        const error = validateField(key, formData[key as keyof FormData] as string);
        if (error) {
          newErrors[key as keyof FormErrors] = error;
          isValid = false;
        }
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  // Manipular mudanças nos inputs
  const handleInputChange = (field: keyof FormData, value: string) => {
    let formattedValue = value;

    if (field === 'document') {
      formattedValue = formatDocument(value);
    } else if (field === 'phone') {
      formattedValue = formatPhone(value);
    } else if (field === 'zipCode') {
      formattedValue = formatZipCode(value);
    }

    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }

    // Limpar mensagens
    if (successMessage) setSuccessMessage('');
    if (errorMessage) setErrorMessage('');
  };

  // Manipular dados do autocomplete de endereço
  const handleAddressSelect = (addressData: AddressData) => {
    setFormData(prev => ({
      ...prev,
      address: addressData.address || '',
      number: addressData.number || '',
      neighborhood: addressData.neighborhood || '',
      city: addressData.city || '',
      state: addressData.state || '',
      zipCode: addressData.zipCode || '',
      latitude: addressData.latitude || null,
      longitude: addressData.longitude || null
    }));

    // Limpar erros dos campos de endereço
    setErrors(prev => ({
      ...prev,
      address: undefined,
      city: undefined,
      state: undefined,
      zipCode: undefined
    }));

    // Mostrar campos de endereço após seleção
    setShowAddressDetails(true);
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setErrorMessage('Por favor, corrija os erros no formulário');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData: any = await response.json();
        throw new Error(errorData.error || 'Erro ao atualizar cliente');
      }

      setSuccessMessage('Cliente atualizado com sucesso!');
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        router.push('/dashboard/clients');
      }, 2000);

    } catch (error: unknown) {
      console.error('Erro ao atualizar cliente:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Erro ao atualizar cliente');
    } finally {
      setIsLoading(false);
    }
  };

  // Cancelar edição
  const handleCancel = () => {
    router.push('/dashboard/clients');
  };

  // Skeleton loader aprimorado
  const SkeletonLoader = () => (
    <div className="animate-pulse space-y-6">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="h-9 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="space-y-2">
            <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
            <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* Form skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        ))}
      </div>

      {/* Address section skeleton */}
      <div className="space-y-4">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
          ))}
        </div>
      </div>

      {/* Buttons skeleton */}
      <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-200 dark:border-gray-700">
        <div className="h-10 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-10 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    </div>
  );

  if (isLoadingData) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <SkeletonLoader />
        </div>
      </div>
    );
  }

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
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Editar Cliente</h1>
                <p className="text-gray-600 dark:text-gray-400">Atualize as informações do cliente</p>
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
                type="tel"
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

          {/* Endereço com Autocomplete */}
          <div className="mt-6">
            <Label className="flex items-center space-x-2 mb-2 text-gray-700 dark:text-gray-300">
              
              <MapPin className="h-5 w-5 text-primary" />
              <span>Endereço *</span>
            </Label>
            <AddressAutocomplete
              onAddressSelect={handleAddressSelect}
              value={formData.address}
              placeholder="Digite o endereço para buscar automaticamente"
              hideLabel
            />
          </div>

          {/* Botões (posicionados logo abaixo do dropdown de endereço) */}
          <div className="flex flex-col sm:flex-row gap-4 mt-4 pt-4">
            <Button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isLoading ? 'Salvando...' : 'Salvar Alterações'}</span>
            </Button>
            
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="flex items-center justify-center space-x-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <X className="h-4 w-4" />
              <span>Cancelar</span>
            </Button>
          </div>

          {/* Campos de endereço (visíveis somente após seleção ou dados existentes) */}
          {showAddressDetails && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Endereço */}
                <div className="space-y-2">
                  <Label htmlFor="address" className="text-gray-700 dark:text-gray-300">Rua/Avenida *</Label>
                  <Input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    placeholder="Nome da rua"
                    className={`${errors.address ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                  />
                  {errors.address && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.address}</p>
                  )}
                </div>

                {/* Número */}
                <div className="space-y-2">
                  <Label htmlFor="number" className="text-gray-700 dark:text-gray-300">Número</Label>
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
                  <Label htmlFor="zipCode" className="text-gray-700 dark:text-gray-300">CEP *</Label>
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
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                {/* Cidade */}
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-gray-700 dark:text-gray-300">Cidade *</Label>
                  <Input
                    id="city"
                    type="text"
                    value={formData.city}
                    onChange={(e) => handleInputChange('city', e.target.value)}
                    placeholder="Nome da cidade"
                    className={`${errors.city ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                  />
                  {errors.city && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                  )}
                </div>

                {/* Estado */}
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-gray-700 dark:text-gray-300">Estado *</Label>
                  <Input
                    id="state"
                    type="text"
                    value={formData.state}
                    onChange={(e) => handleInputChange('state', e.target.value)}
                    placeholder="Paraná, São Paulo, etc."
                    className={`${errors.state ? 'border-red-500 dark:border-red-400' : 'border-gray-300 dark:border-gray-600'} bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400`}
                  />
                  {errors.state && (
                    <p className="text-sm text-red-600 dark:text-red-400">{errors.state}</p>
                  )}
                </div>

                {/* Bairro */}
                <div className="space-y-2">
                  <Label htmlFor="neighborhood" className="text-gray-700 dark:text-gray-300">Bairro</Label>
                  <Input
                    id="neighborhood"
                    type="text"
                    value={formData.neighborhood || ''}
                    onChange={(e) => handleInputChange('neighborhood', e.target.value)}
                    placeholder="Nome do bairro"
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>

              {/* Complemento */}
              <div className="mt-6">
                <div className="space-y-2">
                  <Label htmlFor="complement" className="text-gray-700 dark:text-gray-300">Complemento</Label>
                  <Textarea
                    id="complement"
                    value={formData.complement}
                    onChange={(e) => handleInputChange('complement', e.target.value)}
                    placeholder="Apartamento, bloco, observações..."
                    rows={3}
                    className="border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  />
                </div>
              </div>
            </>
          )}

        </form>
      </div>
    </div>
  );
}
