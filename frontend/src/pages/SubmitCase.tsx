import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { 
  FileText, Upload, CheckCircle2, User, Phone, Mail, FileUp, ArrowRight, CornerDownRight, X, 
  ChevronUp, ChevronDown, Plus, Calendar, MapPin, Briefcase, Landmark, Link2
} from 'lucide-react';

// Type definitions
interface KYCVerification {
  id: string;
  verificationType: string;
  verificationDate: string;
  documentName: string;
}

interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNo: string;
  branchName: string;
  typeOfAccount: string;
  micrNo: string;
  ifscCode: string;
  statementName: string;
}

interface CustomerReference {
  id: string;
  firstName: string;
  middleName: string;
  lastName: string;
  referenceType: string;
  relationship: string;
  phoneNumber: string;
  yearsKnown: string;
  email: string;
}

interface ExistingLoan {
  id: string;
  bankName: string;
  loanType: string;
  loanAmount: string;
  emiAmount: string;
  outstandingAmount: string;
  balanceTenure: string;
}

interface Customer {
  id: string; // Customer 1, Customer 2, etc.
  personal: {
    customerType: string;
    relationWithApplicant: string;
    salutation: string;
    firstName: string;
    middleName: string;
    lastName: string;
    dob: string;
    age: string;
    gender: string;
    kycs: KYCVerification[];
  };
  address: {
    addressType: string;
    addressLine1: string;
    addressLine2: string;
    state: string;
    district: string;
    taluka: string;
    city: string;
    pincode: string;
    yearsInPresentAddress: string;
    landmark: string;
    currentAddressType: string;
  };
  employment: {
    employmentType: string;
    employmentNature: string;
    nameOfOrganisation: string;
    periodInCurrentEmployment: string;
    totalExperience: string;
    netIncomeMonthly: string;
    grossIncomeMonthly: string;
    grossExpensesMonthly: string;
    documents: {
      natureOfBusiness: string;
      employmentDocument: string;
      addressProof: string;
      occupation: string;
    };
  };
  bank: {
    accounts: BankAccount[];
  };
  references: CustomerReference[];
  existingLoans: ExistingLoan[];
}

const SubmitCase: React.FC = () => {
  const { user } = useAuth();
  const { showToast } = useToast();

  // Wizard state
  const [activeStep, setActiveStep] = useState(1);
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  // Success response state
  const [createdFile, setCreatedFile] = useState<{ id: string; applicantName: string; fileType: string; partnerRefId: string | null } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1: Initial Details
  const [customerName, setCustomerName] = useState('');
  const [customerType, setCustomerType] = useState('Applicant');
  const [customerMobile, setCustomerMobile] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');

  // Step 2: Basic Loan Details
  const [appCode, setAppCode] = useState('');
  const [loginDate] = useState(() => {
    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = today.getFullYear();
    return `${dd}-${mm}-${yyyy}`;
  });
  const [leadCreatedBy] = useState(user?.name || 'Partner Agent');
  const [branchLocation, setBranchLocation] = useState('');
  const [productType, setProductType] = useState('HOME_LOAN');
  const [loanType, setLoanType] = useState('New');
  const [purposeOfLoan, setPurposeOfLoan] = useState('');
  const [amountRequested, setAmountRequested] = useState('');
  const [tenureRequested, setTenureRequested] = useState('');
  const [preferredEmi, setPreferredEmi] = useState('');
  const [rateOfInterest, setRateOfInterest] = useState('');
  const [scheme, setScheme] = useState('');
  const [sourceDetails, setSourceDetails] = useState('');

  // Main PDF/Doc upload for the file (corresponds to documentData / documentName in DB)
  const [primaryDocName, setPrimaryDocName] = useState('');
  const [primaryDocBase64, setPrimaryDocBase64] = useState('');

  // Helper to construct empty customer structure
  const createEmptyCustomer = (idString: string, type: string = 'Co-Applicant'): Customer => ({
    id: idString,
    personal: {
      customerType: type,
      relationWithApplicant: type === 'Applicant' ? 'Self' : 'Spouse',
      salutation: 'Mr.',
      firstName: '',
      middleName: '',
      lastName: '',
      dob: '',
      age: '',
      gender: 'Male',
      kycs: []
    },
    address: {
      addressType: 'Permanent',
      addressLine1: '',
      addressLine2: '',
      state: '',
      district: '',
      taluka: '',
      city: '',
      pincode: '',
      yearsInPresentAddress: '',
      landmark: '',
      currentAddressType: 'Owned'
    },
    employment: {
      employmentType: 'Salaried',
      employmentNature: 'Permanent',
      nameOfOrganisation: '',
      periodInCurrentEmployment: '',
      totalExperience: '',
      netIncomeMonthly: '',
      grossIncomeMonthly: '',
      grossExpensesMonthly: '',
      documents: {
        natureOfBusiness: '',
        employmentDocument: '',
        addressProof: '',
        occupation: ''
      }
    },
    bank: {
      accounts: []
    },
    references: [],
    existingLoans: []
  });

  // Step 3: Customers (Dynamic list)
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [activeCustomerIndex, setActiveCustomerIndex] = useState(0);
  const [activeSubTab, setActiveSubTab] = useState<'personal' | 'address' | 'employment' | 'bank' | 'reference' | 'existingLoan'>('personal');

  // Initialize customers list with Customer 1
  useEffect(() => {
    if (customers.length === 0) {
      setCustomers([createEmptyCustomer('Customer 1', 'Applicant')]);
    }
  }, []);

  // Auto-generate Application Code on mount
  useEffect(() => {
    if (!appCode) {
      const randomId = Math.floor(100000 + Math.random() * 900000);
      setAppCode(`APP-${randomId}`);
    }
  }, []);

  // Update Customer 1 Personal Name when Initial Details name changes
  useEffect(() => {
    if (customers.length > 0 && customerName) {
      const names = customerName.trim().split(/\s+/);
      const first = names[0] || '';
      const middle = names.length > 2 ? names.slice(1, names.length - 1).join(' ') : '';
      const last = names.length > 1 ? names[names.length - 1] : '';

      setCustomers(prev => {
        const next = [...prev];
        next[0] = {
          ...next[0],
          personal: {
            ...next[0].personal,
            customerType: customerType,
            firstName: first,
            middleName: middle,
            lastName: last
          }
        };
        return next;
      });
    }
  }, [customerName, customerType]);

  // Sub-forms local states for Customer tabs additions
  // 1. KYC local form
  const [kycSelectVerification, setKycSelectVerification] = useState('PAN Card');
  
  // 2. Bank Account local form
  const [bankAccHolderName, setBankAccHolderName] = useState('');
  const [bankNameVal, setBankNameVal] = useState('');
  const [bankAccNo, setBankAccNo] = useState('');
  const [bankBranch, setBankBranch] = useState('');
  const [bankAccType, setBankAccType] = useState('Savings');
  const [bankMicr, setBankMicr] = useState('');
  const [bankIfsc, setBankIfsc] = useState('');
  const [bankStatementName, setBankStatementName] = useState('');

  // 3. Reference local form
  const [refFirstName, setRefFirstName] = useState('');
  const [refMiddleName, setRefMiddleName] = useState('');
  const [refLastName, setRefLastName] = useState('');
  const [refType, setRefType] = useState('Personal');
  const [refRelationship, setRefRelationship] = useState('Friend');
  const [refPhone, setRefPhone] = useState('');
  const [refYearsKnown, setRefYearsKnown] = useState('');
  const [refEmail, setRefEmail] = useState('');

  // 4. Existing Loan local form
  const [loanFinancier, setLoanFinancier] = useState('');
  const [loanTypeVal, setLoanTypeVal] = useState('Home Loan');
  const [loanAmt, setLoanAmt] = useState('');
  const [loanEmi, setLoanEmi] = useState('');
  const [loanOutstanding, setLoanOutstanding] = useState('');
  const [loanTenureBalance, setLoanTenureBalance] = useState('');

  // Helper for DOB age calculation
  const handleDOBChange = (index: number, dobValue: string) => {
    setCustomers(prev => {
      const next = [...prev];
      let calculatedAge = '';
      if (dobValue) {
        const birthDate = new Date(dobValue);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }
        calculatedAge = isNaN(age) ? '' : String(age);
      }
      next[index] = {
        ...next[index],
        personal: {
          ...next[index].personal,
          dob: dobValue,
          age: calculatedAge
        }
      };
      return next;
    });
  };

  // Convert files helper
  const handleFileRead = (file: File, callback: (base64: string, name: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      showToast('Document size must not exceed 5MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      callback(reader.result as string, file.name);
    };
    reader.onerror = () => {
      showToast('Error reading document file', 'error');
    };
  };

  // Stepper handlers
  const handleNext = () => {
    if (activeStep === 1) {
      if (!customerName || !customerMobile || !customerEmail) {
        showToast('Please fill out all initial customer details.', 'error');
        return;
      }
      setActiveStep(2);
    } else if (activeStep === 2) {
      if (!branchLocation || !purposeOfLoan || !amountRequested || !tenureRequested || !rateOfInterest) {
        showToast('Please complete all mandatory basic loan details.', 'error');
        return;
      }
      setActiveStep(3);
    }
  };

  const handleBack = () => {
    setActiveStep(prev => Math.max(1, prev - 1));
  };

  // Customers tabs management
  const addCustomerTab = () => {
    const nextIndex = customers.length + 1;
    const newCust = createEmptyCustomer(`Customer ${nextIndex}`);
    setCustomers([...customers, newCust]);
    setActiveCustomerIndex(nextIndex - 1);
    setActiveSubTab('personal');
    showToast(`Added Co-Applicant (Customer ${nextIndex})`, 'success');
  };

  const removeCustomerTab = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (customers.length <= 1) return;
    const nextList = customers.filter((_, idx) => idx !== index).map((cust, idx) => ({
      ...cust,
      id: `Customer ${idx + 1}`
    }));
    setCustomers(nextList);
    setActiveCustomerIndex(prev => Math.max(0, prev - 1));
    showToast('Removed Customer card', 'info');
  };

  // Sub tab submission handlers
  const addKYCRecord = () => {
    if (!kycSelectVerification) return;
    const newKYC: KYCVerification = {
      id: Math.random().toString(),
      verificationType: kycSelectVerification,
      verificationDate: new Date().toLocaleDateString(),
      documentName: 'Verified via Instant Pull API'
    };

    setCustomers(prev => {
      const next = [...prev];
      const existing = next[activeCustomerIndex].personal.kycs;
      if (existing.some(k => k.verificationType === kycSelectVerification)) {
        showToast(`${kycSelectVerification} is already verified.`, 'error');
        return prev;
      }
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        personal: {
          ...next[activeCustomerIndex].personal,
          kycs: [...existing, newKYC]
        }
      };
      return next;
    });
    showToast(`KYC Verification record added for ${kycSelectVerification}`, 'success');
  };

  const removeKYCRecord = (kycId: string) => {
    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        personal: {
          ...next[activeCustomerIndex].personal,
          kycs: next[activeCustomerIndex].personal.kycs.filter(k => k.id !== kycId)
        }
      };
      return next;
    });
  };

  const addBankAccount = () => {
    if (!bankAccHolderName || !bankNameVal || !bankAccNo || !bankIfsc) {
      showToast('Please fill out account holder name, bank, account number and IFSC.', 'error');
      return;
    }
    const newBank: BankAccount = {
      id: Math.random().toString(),
      accountHolderName: bankAccHolderName,
      bankName: bankNameVal,
      accountNo: bankAccNo,
      branchName: bankBranch,
      typeOfAccount: bankAccType,
      micrNo: bankMicr,
      ifscCode: bankIfsc,
      statementName: bankStatementName || 'None'
    };

    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        bank: {
          ...next[activeCustomerIndex].bank,
          accounts: [...next[activeCustomerIndex].bank.accounts, newBank]
        }
      };
      return next;
    });

    // Reset local bank inputs
    setBankAccHolderName('');
    setBankNameVal('');
    setBankAccNo('');
    setBankBranch('');
    setBankMicr('');
    setBankIfsc('');
    setBankStatementName('');
    showToast('Bank details submitted successfully', 'success');
  };

  const removeBankAccount = (bankId: string) => {
    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        bank: {
          accounts: next[activeCustomerIndex].bank.accounts.filter(b => b.id !== bankId)
        }
      };
      return next;
    });
  };

  const addReference = () => {
    if (!refFirstName || !refLastName || !refPhone || !refYearsKnown || !refEmail) {
      showToast('First Name, Last Name, Phone Number, Years Known and Email are required.', 'error');
      return;
    }
    const newRef: CustomerReference = {
      id: Math.random().toString(),
      firstName: refFirstName,
      middleName: refMiddleName,
      lastName: refLastName,
      referenceType: refType,
      relationship: refRelationship,
      phoneNumber: refPhone,
      yearsKnown: refYearsKnown,
      email: refEmail
    };

    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        references: [...next[activeCustomerIndex].references, newRef]
      };
      return next;
    });

    // Reset fields
    setRefFirstName('');
    setRefMiddleName('');
    setRefLastName('');
    setRefPhone('');
    setRefYearsKnown('');
    setRefEmail('');
    showToast('Reference added successfully', 'success');
  };

  const removeReference = (refId: string) => {
    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        references: next[activeCustomerIndex].references.filter(r => r.id !== refId)
      };
      return next;
    });
  };

  const addExistingLoan = () => {
    if (!loanFinancier || !loanAmt || !loanEmi) {
      showToast('Financier, Loan Amount and EMI are required.', 'error');
      return;
    }
    const newLoan: ExistingLoan = {
      id: Math.random().toString(),
      bankName: loanFinancier,
      loanType: loanTypeVal,
      loanAmount: loanAmt,
      emiAmount: loanEmi,
      outstandingAmount: loanOutstanding || '0',
      balanceTenure: loanTenureBalance || '0'
    };

    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        existingLoans: [...next[activeCustomerIndex].existingLoans, newLoan]
      };
      return next;
    });

    // Reset fields
    setLoanFinancier('');
    setLoanAmt('');
    setLoanEmi('');
    setLoanOutstanding('');
    setLoanTenureBalance('');
    showToast('Existing loan added', 'success');
  };

  const removeExistingLoan = (loanId: string) => {
    setCustomers(prev => {
      const next = [...prev];
      next[activeCustomerIndex] = {
        ...next[activeCustomerIndex],
        existingLoans: next[activeCustomerIndex].existingLoans.filter(l => l.id !== loanId)
      };
      return next;
    });
  };

  const saveAddressDetails = (e: React.FormEvent) => {
    e.preventDefault();
    const currAddr = customers[activeCustomerIndex].address;
    if (!currAddr.addressLine1 || !currAddr.city || !currAddr.state || !currAddr.pincode) {
      showToast('Address Line 1, City, State and Pincode are mandatory.', 'error');
      return;
    }
    showToast('Customer address details saved temporarily in session.', 'success');
  };

  // Submit complete case file
  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validations
    if (!customerName || !customerMobile) {
      showToast('Initial Applicant details are incomplete.', 'error');
      setActiveStep(1);
      return;
    }
    if (!branchLocation || !amountRequested || !tenureRequested) {
      showToast('Basic Loan details are incomplete.', 'error');
      setActiveStep(2);
      return;
    }

    setSubmitting(true);

    // Prepare complete application JSON payload
    const applicationPayload = {
      initialDetails: {
        customerName,
        customerType,
        customerMobile,
        customerEmail
      },
      basicLoanDetails: {
        appCode,
        loginDate,
        leadCreatedBy,
        branchLocation,
        productType,
        loanType,
        purposeOfLoan,
        amountRequested,
        tenureRequested,
        preferredEmi,
        rateOfInterest,
        scheme,
        sourceDetails
      },
      customers: customers
    };

    try {
      const response = await api.post('/cases', {
        applicantName: customerName,
        contactNumber: customerMobile,
        email: customerEmail,
        fileType: productType,
        partnerRefId: appCode,
        documentData: primaryDocBase64 || undefined,
        documentName: primaryDocName || undefined,
        formData: JSON.stringify(applicationPayload)
      });

      showToast('Sales Application Form Submitted successfully!', 'success');
      setCreatedFile(response.data.file);

      // Reset Wizard States
      setCustomerName('');
      setCustomerMobile('');
      setCustomerEmail('');
      setCustomers([createEmptyCustomer('Customer 1', 'Applicant')]);
      setBranchLocation('');
      setPurposeOfLoan('');
      setAmountRequested('');
      setTenureRequested('');
      setPreferredEmi('');
      setRateOfInterest('');
      setScheme('');
      setSourceDetails('');
      setPrimaryDocName('');
      setPrimaryDocBase64('');
      setActiveStep(1);
    } catch (err: any) {
      const errMsg = err.response?.data?.error || 'Failed to submit case file';
      showToast(errMsg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (createdFile) {
    return (
      <div className="max-w-xl mx-auto glass-card bg-card p-8 rounded-2xl text-center flex flex-col items-center justify-center space-y-6">
        <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-full border border-emerald-500/20 animate-bounce">
          <CheckCircle2 size={48} />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-foreground">File Logged Successfully!</h2>
          <p className="text-sm text-muted-foreground mt-2">The case has been uploaded and queued for credit review.</p>
        </div>

        <div className="w-full bg-muted/50 rounded-xl p-5 text-left border space-y-3">
          <div className="flex justify-between border-b pb-2">
            <span className="text-xs text-muted-foreground">Application Code</span>
            <span className="text-sm font-bold text-primary font-mono">{createdFile.partnerRefId}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-xs text-muted-foreground">Unique File ID</span>
            <span className="text-sm font-bold text-primary font-mono">{createdFile.id}</span>
          </div>
          <div className="flex justify-between border-b pb-2">
            <span className="text-xs text-muted-foreground">Applicant Name</span>
            <span className="text-sm font-semibold text-foreground">{createdFile.applicantName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-muted-foreground">Product Type</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary">{createdFile.fileType.replace('_', ' ')}</span>
          </div>
        </div>

        <div className="flex gap-4 w-full">
          <button
            onClick={() => setCreatedFile(null)}
            className="flex-1 bg-muted hover:bg-muted/80 text-foreground py-2.5 rounded-xl text-sm font-semibold border transition-all"
          >
            File Another Case
          </button>
          <a
            href="/cases"
            className="flex-1 bg-primary hover:bg-primary/95 text-primary-foreground py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1.5 shadow-md shadow-primary/20 transition-all"
          >
            Go to My Cases <ArrowRight size={16} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. COLLAPSIBLE TOP SALES APPLICATION PANEL */}
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm transition-all duration-300">
        <div 
          onClick={() => setIsHeaderCollapsed(!isHeaderCollapsed)}
          className="flex items-center justify-between px-6 py-4 bg-muted/30 cursor-pointer border-b border-border/50 hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <FileText className="text-primary" size={18} />
            <h2 className="text-sm font-bold text-foreground">Sales Application Form</h2>
          </div>
          <div className="text-muted-foreground">
            {isHeaderCollapsed ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </div>
        </div>

        {!isHeaderCollapsed && (
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 bg-card text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground font-semibold">Customer Name:</p>
              <p className="font-bold text-sm text-foreground">{customerName || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-semibold">Customer Type:</p>
              <p className="font-bold text-sm text-foreground">{customerType || '-'}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground font-semibold">Customer Mobile:</p>
              <p className="font-bold text-sm text-foreground">{customerMobile || '-'}</p>
            </div>
          </div>
        )}
      </div>

      {/* 2. STEPPER LAYOUT CONTAINER */}
      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Vertical Progress Stepper */}
        <div className="w-full lg:w-64 shrink-0 bg-card border border-border rounded-xl p-5 shadow-sm h-fit">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-6">Workflow Progress</h3>
          <div className="relative flex lg:flex-col justify-between lg:justify-start lg:space-y-8">
            
            {/* Step 1 indicator */}
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                activeStep > 1 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : activeStep === 1 
                  ? 'border-primary text-primary bg-primary/5 ring-4 ring-primary/10' 
                  : 'border-border text-muted-foreground'
              }`}>
                {activeStep > 1 ? <CheckCircle2 size={16} /> : '1'}
              </div>
              <span className={`text-xs font-semibold hidden md:inline ${activeStep === 1 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                Initial Details
              </span>
            </div>

            {/* Step 2 indicator */}
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                activeStep > 2 
                  ? 'bg-emerald-500 border-emerald-500 text-white' 
                  : activeStep === 2 
                  ? 'border-primary text-primary bg-primary/5 ring-4 ring-primary/10' 
                  : 'border-border text-muted-foreground'
              }`}>
                {activeStep > 2 ? <CheckCircle2 size={16} /> : '2'}
              </div>
              <span className={`text-xs font-semibold hidden md:inline ${activeStep === 2 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                Basic Loan Details
              </span>
            </div>

            {/* Step 3 indicator */}
            <div className="flex items-center gap-3 relative z-10">
              <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold font-mono transition-all duration-300 ${
                activeStep === 3 
                  ? 'border-primary text-primary bg-primary/5 ring-4 ring-primary/10' 
                  : 'border-border text-muted-foreground'
              }`}>
                3
              </div>
              <span className={`text-xs font-semibold hidden md:inline ${activeStep === 3 ? 'text-primary font-bold' : 'text-muted-foreground'}`}>
                Customers
              </span>
            </div>

            {/* Vertical connector line (hidden in small screens) */}
            <div className="absolute left-4 top-2 bottom-2 w-0.5 bg-border -z-0 hidden lg:block" />
          </div>
        </div>

        {/* RIGHT COLUMN: Active Step Contents */}
        <div className="flex-1 bg-card border border-border rounded-xl p-6 shadow-sm min-w-0">
          
          {/* STEP 1: INITIAL DETAILS */}
          {activeStep === 1 && (
            <div className="space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CornerDownRight className="text-primary" size={16} /> Step 1: Initial Customer Particulars
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Provide the applicant's profile snapshot to initiate the application record.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Applicant Name (Full)*</label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 text-muted-foreground" size={15} />
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Enter Full Name"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Customer Type*</label>
                  <select
                    value={customerType}
                    onChange={(e) => setCustomerType(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="Applicant">Applicant (Primary)</option>
                    <option value="Co-Applicant">Co-Applicant</option>
                    <option value="Guarantor">Guarantor</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Mobile Number*</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 text-muted-foreground" size={15} />
                    <input
                      type="tel"
                      required
                      value={customerMobile}
                      onChange={(e) => setCustomerMobile(e.target.value)}
                      placeholder="Enter 10-digit number"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Email Address*</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-muted-foreground" size={15} />
                    <input
                      type="email"
                      required
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="applicant@domain.com"
                      className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 pl-10 pr-4 text-xs outline-none transition-colors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: BASIC LOAN DETAILS */}
          {activeStep === 2 && (
            <div className="space-y-6">
              <div className="border-b pb-3">
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <CornerDownRight className="text-primary" size={16} /> Step 2: Basic Loan Parameters
                </h3>
                <p className="text-xs text-muted-foreground mt-1">Verify general application codes and specify required loan parameters.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Application Code</label>
                  <input
                    type="text"
                    disabled
                    value={appCode}
                    className="w-full bg-muted border border-border rounded-xl py-2.5 px-3 text-xs outline-none font-mono text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Login Date</label>
                  <input
                    type="text"
                    disabled
                    value={loginDate}
                    className="w-full bg-muted border border-border rounded-xl py-2.5 px-3 text-xs outline-none font-semibold text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Lead Created By</label>
                  <input
                    type="text"
                    disabled
                    value={leadCreatedBy}
                    className="w-full bg-muted border border-border rounded-xl py-2.5 px-3 text-xs outline-none font-semibold text-muted-foreground cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Branch Location*</label>
                  <select
                    value={branchLocation}
                    onChange={(e) => setBranchLocation(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="">-- Please Select --</option>
                    <option value="Mumbai Central">Mumbai Central</option>
                    <option value="Pune Main">Pune Main</option>
                    <option value="Delhi NCR">Delhi NCR</option>
                    <option value="Bangalore South">Bangalore South</option>
                    <option value="Hyderabad East">Hyderabad East</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Product Type*</label>
                  <select
                    value={productType}
                    onChange={(e) => setProductType(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="HOME_LOAN">Home Loan</option>
                    <option value="PERSONAL_LOAN">Personal Loan</option>
                    <option value="LAP">Loan Against Property (LAP)</option>
                    <option value="AUTO_LOAN">Auto Loan</option>
                    <option value="BUSINESS_LOAN">Business Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Loan Type*</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="New">New Purchase</option>
                    <option value="Refinance">Refinance / Takeover</option>
                    <option value="Top Up">Top Up Loan</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Purpose of Loan*</label>
                  <select
                    value={purposeOfLoan}
                    onChange={(e) => setPurposeOfLoan(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="">-- Please Select --</option>
                    <option value="Residential Buy">Residential Property Buy</option>
                    <option value="Commercial Buy">Commercial Property Buy</option>
                    <option value="Construction">Construction on Plot</option>
                    <option value="Renovation">Home Improvement / Renovations</option>
                    <option value="Working Capital">Working Capital</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Amount Requested (INR)*</label>
                  <input
                    type="number"
                    value={amountRequested}
                    onChange={(e) => setAmountRequested(e.target.value)}
                    placeholder="Enter Amount"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Tenure Requested (Months)*</label>
                  <input
                    type="number"
                    value={tenureRequested}
                    onChange={(e) => setTenureRequested(e.target.value)}
                    placeholder="Enter Months"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Preferred EMI (INR)</label>
                  <input
                    type="number"
                    value={preferredEmi}
                    onChange={(e) => setPreferredEmi(e.target.value)}
                    placeholder="Enter Preferred EMI"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Rate of Interest (%)*</label>
                  <input
                    type="number"
                    step="0.01"
                    value={rateOfInterest}
                    onChange={(e) => setRateOfInterest(e.target.value)}
                    placeholder="Enter Interest Rate"
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Scheme*</label>
                  <select
                    value={scheme}
                    onChange={(e) => setScheme(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="">-- Please Select --</option>
                    <option value="Regular ROI">Regular Interest Scheme</option>
                    <option value="Step Up Plan">Step-Up Flexi Repayment</option>
                    <option value="Fixed ROI Flat">Fixed ROI for first 3 years</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-muted-foreground mb-1.5">Source Details*</label>
                  <select
                    value={sourceDetails}
                    onChange={(e) => setSourceDetails(e.target.value)}
                    className="w-full bg-background border border-border focus:border-primary rounded-xl py-2.5 px-3 text-xs outline-none transition-colors"
                  >
                    <option value="">-- Please Select --</option>
                    <option value="Direct Sales Agent">Direct Sales Agent (DSA)</option>
                    <option value="Digital Lead">Digital Ads Lead</option>
                    <option value="Partner Referral">External Partner Referral</option>
                  </select>
                </div>
              </div>

              {/* PRIMARY UPLOAD IN STEP 2 */}
              <div className="pt-4 border-t space-y-3">
                <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1">
                  <FileText size={14} /> Main Document Upload (Mandatory)
                </h4>
                {!primaryDocName ? (
                  <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 transition-colors relative">
                    <input
                      type="file"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileRead(file, (base64, name) => {
                          setPrimaryDocName(name);
                          setPrimaryDocBase64(base64);
                        });
                      }}
                      accept=".pdf,image/png,image/jpeg,image/jpg"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center gap-1.5">
                      <div className="bg-muted p-2.5 rounded-full text-muted-foreground">
                        <Upload size={20} />
                      </div>
                      <p className="text-xs font-bold text-foreground">Click to upload or drag Case Appraisal Document</p>
                      <p className="text-[10px] text-muted-foreground">Supported format: PDF, PNG, JPG (Max 5MB)</p>
                    </div>
                  </div>
                ) : (
                  <div className="bg-muted/40 border rounded-xl p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="bg-primary/10 text-primary p-2 rounded-lg border border-primary/20">
                        <FileText size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold truncate text-foreground">{primaryDocName}</p>
                        <p className="text-[9px] text-muted-foreground">Document conversion payload prepared</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setPrimaryDocName('');
                        setPrimaryDocBase64('');
                      }}
                      className="bg-red-500/10 hover:bg-red-500/20 text-red-500 p-1.5 rounded-lg transition-colors border border-red-500/20"
                    >
                      <X size={12} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 3: CUSTOMERS & TABS */}
          {activeStep === 3 && (
            <div className="space-y-6">
              
              {/* Dynamic Customer Tabs bar */}
              <div className="flex flex-wrap items-center gap-2 border-b pb-3">
                {customers.map((cust, idx) => (
                  <div
                    key={cust.id}
                    onClick={() => {
                      setActiveCustomerIndex(idx);
                      setActiveSubTab('personal');
                    }}
                    className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-t-xl cursor-pointer border-t border-x transition-colors -mb-[13px] ${
                      activeCustomerIndex === idx
                        ? 'bg-card border-border text-primary border-b-card z-10'
                        : 'bg-muted/30 border-transparent text-muted-foreground hover:bg-muted/65 hover:text-foreground'
                    }`}
                  >
                    <span>{cust.id}</span>
                    {idx > 0 && (
                      <span 
                        onClick={(e) => removeCustomerTab(idx, e)}
                        className="p-0.5 rounded-md hover:bg-red-500/10 hover:text-red-500 transition-colors"
                      >
                        <X size={12} />
                      </span>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={addCustomerTab}
                  className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-1 transition-all"
                >
                  <Plus size={13} /> Add Co-Applicant
                </button>
              </div>

              {/* Sub-Tabs Selector */}
              <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
                {(['personal', 'address', 'employment', 'bank', 'reference', 'existingLoan'] as const).map(tab => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveSubTab(tab)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      activeSubTab === tab
                        ? 'bg-primary text-white border-primary shadow-sm shadow-primary/15'
                        : 'bg-muted/10 hover:bg-muted/30 border-border text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab.charAt(0).toUpperCase() + tab.slice(1).replace('Loan', ' Loan')}
                  </button>
                ))}
              </div>

              {/* SUB-TAB CONTENTS */}
              {customers[activeCustomerIndex] && (
                <div className="space-y-6">
                  
                  {/* SUBTAB 1: PERSONAL & KYC DETAILS */}
                  {activeSubTab === 'personal' && (
                    <div className="space-y-6">
                      
                      {/* KYC Verification Sub-Section */}
                      <div className="bg-muted/20 border rounded-xl p-4 space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <h4 className="text-xs font-bold text-foreground">KYC Verification (Instant Pull)</h4>
                            <p className="text-[10px] text-muted-foreground">Select KYC documentation below to pull profile verification.</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <select
                              value={kycSelectVerification}
                              onChange={(e) => setKycSelectVerification(e.target.value)}
                              className="bg-background border border-border rounded-xl text-xs py-1.5 px-3 outline-none focus:border-primary text-foreground"
                            >
                              <option value="PAN Card">PAN Card Verification</option>
                              <option value="Aadhaar Card">Aadhaar Card (UIDAI)</option>
                              <option value="Passport">Passport Vetting</option>
                              <option value="Voter ID">Voter ID Pull</option>
                            </select>
                            <button
                              type="button"
                              onClick={addKYCRecord}
                              className="bg-primary hover:bg-primary/95 text-white py-1.5 px-3 rounded-xl text-xs font-bold transition-colors"
                            >
                              Add KYC
                            </button>
                          </div>
                        </div>

                        {/* KYC Verification Table */}
                        <div className="border rounded-xl overflow-hidden bg-card">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                                <th className="px-4 py-2.5">Sr.No</th>
                                <th className="px-4 py-2.5">Customer Type</th>
                                <th className="px-4 py-2.5">Verification Date</th>
                                <th className="px-4 py-2.5">Verification Type</th>
                                <th className="px-4 py-2.5 text-center">Status</th>
                                <th className="px-4 py-2.5 text-center">Action</th>
                              </tr>
                            </thead>
                            <tbody>
                              {customers[activeCustomerIndex].personal.kycs.length > 0 ? (
                                customers[activeCustomerIndex].personal.kycs.map((kyc, i) => (
                                  <tr key={kyc.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                    <td className="px-4 py-2.5 font-semibold font-mono">{i + 1}</td>
                                    <td className="px-4 py-2.5">{customers[activeCustomerIndex].personal.customerType}</td>
                                    <td className="px-4 py-2.5 text-muted-foreground">{kyc.verificationDate}</td>
                                    <td className="px-4 py-2.5 font-semibold">{kyc.verificationType}</td>
                                    <td className="px-4 py-2.5 text-center">
                                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold text-[10px] border border-emerald-500/20">
                                        VERIFIED
                                      </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-center">
                                      <button
                                        type="button"
                                        onClick={() => removeKYCRecord(kyc.id)}
                                        className="text-red-500 hover:text-red-600 transition-colors"
                                      >
                                        Delete
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={6} className="text-center py-6 text-muted-foreground italic">
                                    No verification records found. Select an option to pull details.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Personal Details inputs */}
                      <div className="space-y-4">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                          <User size={13} /> Personal Details
                        </h4>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Select Customer Type*</label>
                            <select
                              value={customers[activeCustomerIndex].personal.customerType}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.customerType = val;
                                  return next;
                                });
                              }}
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            >
                              <option value="Applicant">Applicant (Primary)</option>
                              <option value="Co-Applicant">Co-Applicant</option>
                              <option value="Guarantor">Guarantor</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Relation with Applicant*</label>
                            <select
                              value={customers[activeCustomerIndex].personal.relationWithApplicant}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.relationWithApplicant = val;
                                  return next;
                                });
                              }}
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            >
                              <option value="Self">Self (Primary Applicant)</option>
                              <option value="Spouse">Spouse</option>
                              <option value="Father">Father</option>
                              <option value="Mother">Mother</option>
                              <option value="Brother">Brother</option>
                              <option value="Sister">Sister</option>
                              <option value="Others">Others</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Salutation*</label>
                            <select
                              value={customers[activeCustomerIndex].personal.salutation}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.salutation = val;
                                  return next;
                                });
                              }}
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            >
                              <option value="Mr.">Mr.</option>
                              <option value="Mrs.">Mrs.</option>
                              <option value="Ms.">Ms.</option>
                              <option value="Dr.">Dr.</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">First Name*</label>
                            <input
                              type="text"
                              value={customers[activeCustomerIndex].personal.firstName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.firstName = val;
                                  return next;
                                });
                              }}
                              placeholder="Enter first name"
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Middle Name</label>
                            <input
                              type="text"
                              value={customers[activeCustomerIndex].personal.middleName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.middleName = val;
                                  return next;
                                });
                              }}
                              placeholder="Enter middle name"
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Last Name*</label>
                            <input
                              type="text"
                              value={customers[activeCustomerIndex].personal.lastName}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.lastName = val;
                                  return next;
                                });
                              }}
                              placeholder="Enter last name"
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Date of Birth*</label>
                            <div className="relative">
                              <Calendar className="absolute left-3 top-2.5 text-muted-foreground" size={14} />
                              <input
                                type="date"
                                value={customers[activeCustomerIndex].personal.dob}
                                onChange={(e) => handleDOBChange(activeCustomerIndex, e.target.value)}
                                className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 pl-9 pr-3 text-xs outline-none transition-colors"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Age (Calculated)</label>
                            <input
                              type="text"
                              disabled
                              value={customers[activeCustomerIndex].personal.age}
                              placeholder="DOB sets age"
                              className="w-full bg-muted border border-border rounded-xl py-2 px-3 text-xs outline-none cursor-not-allowed text-muted-foreground font-semibold"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-muted-foreground mb-1.5">Gender*</label>
                            <select
                              value={customers[activeCustomerIndex].personal.gender}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomers(prev => {
                                  const next = [...prev];
                                  next[activeCustomerIndex].personal.gender = val;
                                  return next;
                                });
                              }}
                              className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                            >
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 2: ADDRESS DETAILS */}
                  {activeSubTab === 'address' && (
                    <form onSubmit={saveAddressDetails} className="space-y-6">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                        <MapPin size={13} /> Address Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Address Type*</label>
                          <select
                            value={customers[activeCustomerIndex].address.addressType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.addressType = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Permanent">Permanent Address</option>
                            <option value="Current">Current Residential Address</option>
                            <option value="Office">Office/Employment Address</option>
                          </select>
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Address Line 1*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].address.addressLine1}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.addressLine1 = val;
                                return next;
                              });
                            }}
                            placeholder="Enter building number, street name"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div className="md:col-span-3">
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Address Line 2</label>
                          <input
                            type="text"
                            value={customers[activeCustomerIndex].address.addressLine2}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.addressLine2 = val;
                                return next;
                              });
                            }}
                            placeholder="Apartment/floor, area details"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">State*</label>
                          <select
                            value={customers[activeCustomerIndex].address.state}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.state = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="">-- Please Select --</option>
                            <option value="Maharashtra">Maharashtra</option>
                            <option value="Karnataka">Karnataka</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Telangana">Telangana</option>
                            <option value="Tamil Nadu">Tamil Nadu</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">District*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].address.district}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.district = val;
                                return next;
                              });
                            }}
                            placeholder="Enter district"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Taluka</label>
                          <input
                            type="text"
                            value={customers[activeCustomerIndex].address.taluka}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.taluka = val;
                                return next;
                              });
                            }}
                            placeholder="Enter taluka"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">City*</label>
                          <select
                            value={customers[activeCustomerIndex].address.city}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.city = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="">-- Please Select --</option>
                            <option value="Mumbai">Mumbai</option>
                            <option value="Pune">Pune</option>
                            <option value="Bangalore">Bangalore</option>
                            <option value="Delhi">Delhi</option>
                            <option value="Hyderabad">Hyderabad</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Pincode*</label>
                          <select
                            value={customers[activeCustomerIndex].address.pincode}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.pincode = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="">-- Please Select --</option>
                            <option value="400001">400001 (Mumbai)</option>
                            <option value="411001">411001 (Pune)</option>
                            <option value="560001">560001 (Bangalore)</option>
                            <option value="110001">110001 (Delhi)</option>
                            <option value="500001">500001 (Hyderabad)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">No of Years (In Present Address)*</label>
                          <input
                            type="number"
                            required
                            value={customers[activeCustomerIndex].address.yearsInPresentAddress}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.yearsInPresentAddress = val;
                                return next;
                              });
                            }}
                            placeholder="Enter years"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Landmark*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].address.landmark}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.landmark = val;
                                return next;
                              });
                            }}
                            placeholder="Near railway station, school etc."
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Current address type*</label>
                          <select
                            value={customers[activeCustomerIndex].address.currentAddressType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].address.currentAddressType = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Owned">Owned Property</option>
                            <option value="Rented">Rented Accommodation</option>
                            <option value="Parental">Parental House</option>
                            <option value="Company Provided">Company Quarter</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-3 border-t pt-4">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomers(prev => {
                              const next = [...prev];
                              next[activeCustomerIndex].address = createEmptyCustomer('dummy').address;
                              return next;
                            });
                          }}
                          className="bg-red-500 text-white hover:bg-red-600 px-4 py-2 rounded-xl text-xs font-bold transition-all font-sans"
                        >
                          Clear
                        </button>
                        <button
                          type="submit"
                          className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all font-sans"
                        >
                          Submit
                        </button>
                      </div>
                    </form>
                  )}

                  {/* SUBTAB 3: EMPLOYMENT DETAILS */}
                  {activeSubTab === 'employment' && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                        <Briefcase size={13} /> Employment Details
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Employment Type*</label>
                          <select
                            value={customers[activeCustomerIndex].employment.employmentType}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.employmentType = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Salaried">Salaried</option>
                            <option value="Self Employed">Self Employed</option>
                            <option value="Professional">Professional (Doctor/CA)</option>
                            <option value="Retired">Retired / Unemployed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Employment Nature*</label>
                          <select
                            value={customers[activeCustomerIndex].employment.employmentNature}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.employmentNature = val;
                                return next;
                              });
                            }}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Permanent">Permanent</option>
                            <option value="Contract">Contractual</option>
                            <option value="Proprietor">Proprietor</option>
                            <option value="Partner">Partnership Firm</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Name of Organisation*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].employment.nameOfOrganisation}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.nameOfOrganisation = val;
                                return next;
                              });
                            }}
                            placeholder="Enter Company Name"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Period in Current Employment/Business*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].employment.periodInCurrentEmployment}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.periodInCurrentEmployment = val;
                                return next;
                              });
                            }}
                            placeholder="e.g. 3 years"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Total Experience*</label>
                          <input
                            type="text"
                            required
                            value={customers[activeCustomerIndex].employment.totalExperience}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.totalExperience = val;
                                return next;
                              });
                            }}
                            placeholder="e.g. 8 years"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Net Income (monthly)*</label>
                          <input
                            type="number"
                            required
                            value={customers[activeCustomerIndex].employment.netIncomeMonthly}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.netIncomeMonthly = val;
                                return next;
                              });
                            }}
                            placeholder="Net Pay"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Gross Income (monthly)*</label>
                          <input
                            type="number"
                            required
                            value={customers[activeCustomerIndex].employment.grossIncomeMonthly}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.grossIncomeMonthly = val;
                                return next;
                              });
                            }}
                            placeholder="Gross Pay"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Gross Expenses (monthly)*</label>
                          <input
                            type="number"
                            required
                            value={customers[activeCustomerIndex].employment.grossExpensesMonthly}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomers(prev => {
                                const next = [...prev];
                                next[activeCustomerIndex].employment.grossExpensesMonthly = val;
                                return next;
                              });
                            }}
                            placeholder="Total Outstandings"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>

                      {/* Employment Document checklist table */}
                      <div className="space-y-3">
                        <h5 className="text-xs font-bold text-foreground">Required Employment/Verification Documents</h5>
                        
                        <div className="border rounded-xl bg-card overflow-hidden">
                          <table className="w-full text-left text-xs border-collapse">
                            <thead>
                              <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                                <th className="px-4 py-2.5">Document Name</th>
                                <th className="px-4 py-2.5">Choose file</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(['natureOfBusiness', 'employmentDocument', 'addressProof', 'occupation'] as const).map(docKey => {
                                const labels: Record<string, string> = {
                                  natureOfBusiness: 'Nature of Business Evidence',
                                  employmentDocument: 'Employment Document (Payslip / ITR)',
                                  addressProof: 'Address Proof (Utility Bill)',
                                  occupation: 'Occupation Details Cert / ID card'
                                };

                                return (
                                  <tr key={docKey} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                    <td className="px-4 py-3 font-semibold text-foreground">{labels[docKey]}</td>
                                    <td className="px-4 py-3">
                                      <div className="flex items-center gap-2">
                                        <input
                                          type="file"
                                          accept=".pdf,image/png,image/jpeg,image/jpg"
                                          onChange={(e) => {
                                            const file = e.target.files?.[0];
                                            if (file) handleFileRead(file, (_, name) => {
                                              setCustomers(prev => {
                                                const next = [...prev];
                                                next[activeCustomerIndex].employment.documents[docKey] = name;
                                                return next;
                                              });
                                            });
                                          }}
                                          className="text-xs"
                                        />
                                        {customers[activeCustomerIndex].employment.documents[docKey] && (
                                          <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-full font-bold">
                                            ✓ {customers[activeCustomerIndex].employment.documents[docKey]}
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 4: BANK DETAILS */}
                  {activeSubTab === 'bank' && (
                    <div className="space-y-6">
                      
                      <div className="flex flex-wrap items-center justify-between border-b pb-2 gap-3">
                        <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                          <Landmark size={13} /> Bank Details
                        </h4>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => showToast('Bank e-Consent has been initiated successfully.', 'success')}
                            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors border"
                          >
                            Initiate Consent
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBankAccHolderName(customerName);
                              setBankNameVal('HDFC Bank');
                              setBankAccNo('501002241578');
                              setBankBranch('Bandra West');
                              setBankIfsc('HDFC0000078');
                              setBankStatementName('E-Statement_Pulled_2026.pdf');
                              showToast('Mock data pulled successfully via API.', 'success');
                            }}
                            className="bg-primary hover:bg-primary/95 text-white font-bold text-xs py-1.5 px-3 rounded-lg transition-colors border"
                          >
                            Pull Data
                          </button>
                        </div>
                      </div>

                      {/* Bank Details Inputs */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Account Holder Name*</label>
                          <input
                            type="text"
                            value={bankAccHolderName}
                            onChange={(e) => setBankAccHolderName(e.target.value)}
                            placeholder="As per Passbook"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Bank Name*</label>
                          <select
                            value={bankNameVal}
                            onChange={(e) => setBankNameVal(e.target.value)}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="">-- Please Select --</option>
                            <option value="State Bank of India">State Bank of India (SBI)</option>
                            <option value="HDFC Bank">HDFC Bank Ltd</option>
                            <option value="ICICI Bank">ICICI Bank Ltd</option>
                            <option value="Axis Bank">Axis Bank Ltd</option>
                            <option value="Kotak Mahindra Bank">Kotak Mahindra Bank</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Account No*</label>
                          <input
                            type="text"
                            value={bankAccNo}
                            onChange={(e) => setBankAccNo(e.target.value)}
                            placeholder="Enter A/C number"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Branch Name*</label>
                          <input
                            type="text"
                            value={bankBranch}
                            onChange={(e) => setBankBranch(e.target.value)}
                            placeholder="Enter branch"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Type Of A/C*</label>
                          <select
                            value={bankAccType}
                            onChange={(e) => setBankAccType(e.target.value)}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Savings">Savings Account</option>
                            <option value="Current">Current Account</option>
                            <option value="OD">Overdraft Account</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">MICR No</label>
                          <input
                            type="text"
                            value={bankMicr}
                            onChange={(e) => setBankMicr(e.target.value)}
                            placeholder="Enter MICR code"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">IFSC Code*</label>
                          <input
                            type="text"
                            value={bankIfsc}
                            onChange={(e) => setBankIfsc(e.target.value)}
                            placeholder="Enter IFSC code"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors font-mono"
                          />
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Upload Bank Statement</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept=".pdf,image/png,image/jpeg,image/jpg"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleFileRead(file, (_, name) => {
                                  setBankStatementName(name);
                                });
                              }}
                              className="text-xs"
                            />
                            {bankStatementName && (
                              <span className="text-[10px] bg-primary/10 text-primary border px-2 py-0.5 rounded font-mono truncate max-w-xs">
                                {bankStatementName}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={addBankAccount}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all font-sans"
                        >
                          Submit
                        </button>
                      </div>

                      {/* Banks Table */}
                      <div className="border rounded-xl bg-card overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                              <th className="px-4 py-2.5">Account Holder</th>
                              <th className="px-4 py-2.5">Bank Name</th>
                              <th className="px-4 py-2.5">Ac. No.</th>
                              <th className="px-4 py-2.5">Branch</th>
                              <th className="px-4 py-2.5">Type</th>
                              <th className="px-4 py-2.5 font-mono">IFSC</th>
                              <th className="px-4 py-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers[activeCustomerIndex].bank.accounts.length > 0 ? (
                              customers[activeCustomerIndex].bank.accounts.map(acc => (
                                <tr key={acc.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-2.5 font-semibold text-foreground">{acc.accountHolderName}</td>
                                  <td className="px-4 py-2.5">{acc.bankName}</td>
                                  <td className="px-4 py-2.5 font-mono">{acc.accountNo}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground">{acc.branchName}</td>
                                  <td className="px-4 py-2.5">{acc.typeOfAccount}</td>
                                  <td className="px-4 py-2.5 font-mono font-bold text-primary">{acc.ifscCode}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeBankAccount(acc.id)}
                                      className="text-red-500 hover:text-red-600 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="text-center py-6 text-muted-foreground italic">
                                  No bank details added yet. Submit details to insert records.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 5: CUSTOMER REFERENCE DETAILS */}
                  {activeSubTab === 'reference' && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                        <User size={13} /> Reference Details
                      </h4>

                      {/* Inputs for references */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">First name*</label>
                          <input
                            type="text"
                            value={refFirstName}
                            onChange={(e) => setRefFirstName(e.target.value)}
                            placeholder="Enter first name"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Middle name</label>
                          <input
                            type="text"
                            value={refMiddleName}
                            onChange={(e) => setRefMiddleName(e.target.value)}
                            placeholder="Enter middle name"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Last name*</label>
                          <input
                            type="text"
                            value={refLastName}
                            onChange={(e) => setRefLastName(e.target.value)}
                            placeholder="Enter last name"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Reference type</label>
                          <select
                            value={refType}
                            onChange={(e) => setRefType(e.target.value)}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Personal">Personal Reference</option>
                            <option value="Professional">Professional Reference</option>
                            <option value="Neighbor">Neighbor Reference</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Relationship*</label>
                          <select
                            value={refRelationship}
                            onChange={(e) => setRefRelationship(e.target.value)}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Friend">Friend</option>
                            <option value="Colleague">Colleague</option>
                            <option value="Manager">Manager</option>
                            <option value="Relative">Relative</option>
                            <option value="Neighbor">Neighbor</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Phone number*</label>
                          <input
                            type="tel"
                            value={refPhone}
                            onChange={(e) => setRefPhone(e.target.value)}
                            placeholder="Enter mobile/landline"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Years known*</label>
                          <input
                            type="number"
                            value={refYearsKnown}
                            onChange={(e) => setRefYearsKnown(e.target.value)}
                            placeholder="Years acquainted"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Email*</label>
                          <input
                            type="email"
                            value={refEmail}
                            onChange={(e) => setRefEmail(e.target.value)}
                            placeholder="reference@domain.com"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t">
                        <button
                          type="button"
                          onClick={() => {
                            setRefFirstName('');
                            setRefMiddleName('');
                            setRefLastName('');
                            setRefPhone('');
                            setRefYearsKnown('');
                            setRefEmail('');
                          }}
                          className="bg-red-500 hover:bg-red-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all font-sans"
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={addReference}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all font-sans"
                        >
                          Submit
                        </button>
                      </div>

                      {/* References Table */}
                      <div className="border rounded-xl bg-card overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                              <th className="px-4 py-2.5">Full Name</th>
                              <th className="px-4 py-2.5">Reference Type</th>
                              <th className="px-4 py-2.5">Relationship</th>
                              <th className="px-4 py-2.5">Phone Number</th>
                              <th className="px-4 py-2.5 text-center">Years Known</th>
                              <th className="px-4 py-2.5">Email</th>
                              <th className="px-4 py-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers[activeCustomerIndex].references.length > 0 ? (
                              customers[activeCustomerIndex].references.map(ref => (
                                <tr key={ref.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-2.5 font-semibold text-foreground">
                                    {`${ref.firstName} ${ref.middleName} ${ref.lastName}`.trim().replace(/\s+/g, ' ')}
                                  </td>
                                  <td className="px-4 py-2.5">{ref.referenceType}</td>
                                  <td className="px-4 py-2.5 text-muted-foreground">{ref.relationship}</td>
                                  <td className="px-4 py-2.5 font-mono">{ref.phoneNumber}</td>
                                  <td className="px-4 py-2.5 text-center">{ref.yearsKnown} years</td>
                                  <td className="px-4 py-2.5 font-mono text-[10px]">{ref.email}</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeReference(ref.id)}
                                      className="text-red-500 hover:text-red-600 transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="text-center py-6 text-muted-foreground italic">
                                  No customer references added yet. Please specify references.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* SUBTAB 6: EXISTING LOAN DETAILS */}
                  {activeSubTab === 'existingLoan' && (
                    <div className="space-y-6">
                      <h4 className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-1.5 border-b pb-2">
                        <Link2 size={13} /> Existing Loans / Liabilities
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Bank/Financier Name</label>
                          <input
                            type="text"
                            value={loanFinancier}
                            onChange={(e) => setLoanFinancier(e.target.value)}
                            placeholder="e.g. SBI, HDFC"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Loan Type</label>
                          <select
                            value={loanTypeVal}
                            onChange={(e) => setLoanTypeVal(e.target.value)}
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          >
                            <option value="Home Loan">Home Loan</option>
                            <option value="Personal Loan">Personal Loan</option>
                            <option value="Auto Loan">Auto Loan</option>
                            <option value="LAP">Loan Against Property (LAP)</option>
                            <option value="Credit Card">Credit Card EMI</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5">Loan Amount (INR)</label>
                          <input
                            type="number"
                            value={loanAmt}
                            onChange={(e) => setLoanAmt(e.target.value)}
                            placeholder="Sanctioned amount"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">EMI Amount (monthly)</label>
                          <input
                            type="number"
                            value={loanEmi}
                            onChange={(e) => setLoanEmi(e.target.value)}
                            placeholder="Monthly Payment"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Outstanding Amount</label>
                          <input
                            type="number"
                            value={loanOutstanding}
                            onChange={(e) => setLoanOutstanding(e.target.value)}
                            placeholder="Current balance"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-muted-foreground mb-1.5 font-sans">Balance Tenure (Months)</label>
                          <input
                            type="number"
                            value={loanTenureBalance}
                            onChange={(e) => setLoanTenureBalance(e.target.value)}
                            placeholder="Remaining months"
                            className="w-full bg-background border border-border focus:border-primary rounded-xl py-2 px-3 text-xs outline-none transition-colors"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <button
                          type="button"
                          onClick={addExistingLoan}
                          className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs py-2 px-4 rounded-xl transition-all font-sans"
                        >
                          Submit
                        </button>
                      </div>

                      {/* Loans Table */}
                      <div className="border rounded-xl bg-card overflow-hidden">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-muted/40 border-b font-bold text-muted-foreground">
                              <th className="px-4 py-2.5">Bank/Financier</th>
                              <th className="px-4 py-2.5">Loan Type</th>
                              <th className="px-4 py-2.5">Sanctioned Amount</th>
                              <th className="px-4 py-2.5">EMI (Monthly)</th>
                              <th className="px-4 py-2.5">Outstanding Bal</th>
                              <th className="px-4 py-2.5 text-center">Remaining Tenure</th>
                              <th className="px-4 py-2.5 text-center">Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customers[activeCustomerIndex].existingLoans.length > 0 ? (
                              customers[activeCustomerIndex].existingLoans.map(l => (
                                <tr key={l.id} className="border-b last:border-0 hover:bg-muted/10 transition-colors">
                                  <td className="px-4 py-2.5 font-semibold text-foreground">{l.bankName}</td>
                                  <td className="px-4 py-2.5 font-semibold text-primary">{l.loanType}</td>
                                  <td className="px-4 py-2.5 font-mono font-bold font-sans">₹{Number(l.loanAmount).toLocaleString()}</td>
                                  <td className="px-4 py-2.5 font-mono text-red-500 font-sans">₹{Number(l.emiAmount).toLocaleString()}</td>
                                  <td className="px-4 py-2.5 font-mono text-muted-foreground font-sans">₹{Number(l.outstandingAmount).toLocaleString()}</td>
                                  <td className="px-4 py-2.5 text-center">{l.balanceTenure} months</td>
                                  <td className="px-4 py-2.5 text-center">
                                    <button
                                      type="button"
                                      onClick={() => removeExistingLoan(l.id)}
                                      className="text-red-500 hover:text-red-600 transition-colors font-semibold"
                                    >
                                      Delete
                                    </button>
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td colSpan={7} className="text-center py-6 text-muted-foreground italic">
                                  No existing loans reported for this applicant.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}

          {/* STEPPER ACTION BUTTONS AT BOTTOM */}
          <div className="pt-6 mt-6 border-t flex items-center justify-end gap-3">
            {activeStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="bg-muted hover:bg-muted/80 text-foreground font-semibold text-xs px-5 py-2.5 rounded-xl border transition-all"
              >
                Back
              </button>
            )}
            
            {activeStep < 3 ? (
              <button
                type="button"
                onClick={handleNext}
                className="bg-primary hover:bg-primary/95 text-white font-semibold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1 shadow-md shadow-primary/10 transition-all active:scale-[0.98]"
              >
                Next <ArrowRight size={13} />
              </button>
            ) : (
              <button
                type="button"
                disabled={submitting}
                onClick={handleSubmitCase}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-xs px-6 py-2.5 rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-500/10 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <FileUp size={14} /> Submit Application
                  </>
                )}
              </button>
            )}
          </div>

        </div>

      </div>
    </div>
  );
};

export default SubmitCase;
