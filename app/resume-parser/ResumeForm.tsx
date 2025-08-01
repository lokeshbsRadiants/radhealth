import { useEffect, useRef, useState } from 'react';
import { getSkills, getStatesByCountry } from '../services/commonServices';
import { parseCertificateWithGemini } from './certificateParser';

interface ResumeFormProps {
  initialData: IResume;
  onSubmit: (e: React.FormEvent, data: IResume, certifications: Certification[]) => void;
  onCancel?: () => void;
}
export interface Certification {
  id: string;                     // Unique ID for React key/reference
  name: string;                   // Selected certificate type (e.g., "AWS", "PMP")
  file: File | null;              // The uploaded file

  // Optional fields parsed from the certificate or edited manually
  certificateType?: string;       // Type/category of certificate
  certificateFullName?: string;   // Full name of the certificate (e.g., "AWS Solutions Architect Associate")
  nameOnLicense?: string;         // Name printed on certificate
  issuedNo?: string;              // Certificate/license number
  issuedDate?: string;            // In ISO format: 'YYYY-MM-DD'
  expiryDate?: string;            // In ISO format: 'YYYY-MM-DD'
  issuedCenter?: string;          // Organization that issued the cert
}


export interface State {
  State: string;
}

const CERT_OPTIONS = [
  "ABOR", "ACLR", "BLS", "LPN", "NBSTSA",
  "NIHSS", "PALS", "RN", "Others"
];


export default function ResumeForm({ initialData, onSubmit, onCancel }: ResumeFormProps) {
  const [formData, setFormData] = useState<IResume>(() => ({
    name: {
      first: initialData?.name?.first || '',
      middle: initialData?.name?.middle || '',
      last: initialData?.name?.last || ''
    },
    email: initialData?.email || '',
    telephone: initialData?.telephone || '',
    homePhone: initialData?.homePhone || '',
    address: {
      street: initialData?.address?.street || '',
      city: initialData?.address?.city || '',
      state: initialData?.address?.state || '',
      zip: initialData?.address?.zip || '',
      country: initialData?.address?.country || '',
      address: initialData?.address?.address || ''
    },
    gender: initialData?.gender || '',
    skills: [],
    employmentBasis: initialData?.employmentBasis || '',
    authorization: initialData?.authorization || false,
    experience: initialData?.experience || 0,
    workStatus: initialData?.workStatus || '',
    resumeCategory: initialData?.resumeCategory || 'Health Care',
    certificates: initialData?.certificates || [],
    coverLetter: initialData?.coverLetter || '',
    resumeText: initialData?.resumeText || ''
  }));


  // Define file input ref at the top
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const addCertification = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const [certifications, setCertifications] = useState<Array<{
    id: string;
    name: string;
    file: File | null;
    certificateType?: string;
    certificateFullName?: string;
    nameOnLicense?: string;
    issuedNo?: string;
    issuedDate?: string;
    expiryDate?: string;
    issuedCenter?: string;
  }>>([]);


  const [isSubmitting, setIsSubmitting] = useState(false);
  const [certificateParsing, setCertifcateParsing] = useState
    (false)
  const [skillsInput, setSkillsInput] = useState('');
  const [showSkillSuggestions, setShowSkillSuggestions] = useState(false);
  const [stateOptions, setStateOptions] = useState<State[]>([]);
  const [skills, setSkills] = useState<{ Skill: string }[] | null>(null);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    if (name.startsWith('name.')) {
      const field = name.split('.')[1] as keyof IResume['name'];
      setFormData(prev => ({
        ...prev,
        name: {
          ...prev.name,
          [field]: value
        }
      }));
    } else if (name.startsWith('address.')) {
      const field = name.split('.')[1] as keyof IResume['address'];
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [field]: value
        }
      }));
    } else if (name === 'skills') {
      const skills = value.split(',').map(skill => skill.trim()).filter(Boolean);
      setFormData(prev => ({
        ...prev,
        skills
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked :
          type === 'number' ? parseFloat(value) || 0 : value
      }));
    }
  };





  const removeSkill = (skillToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      skills: prev.skills.filter(skill => skill !== skillToRemove)
    }));
  };



  const handleSubmit = async (e: React.FormEvent, jobData: IResume, certifications: Array<Certification>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      await onSubmit(e, jobData, certifications);
      setSubmitStatus({
        type: 'success',
        message: 'Form submitted successfully!'
      });
    } catch (error) {
      setSubmitStatus({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to submit form. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const genderOptions = [
    { value: 'Male', label: 'Male' },
    { value: 'Female', label: 'Female' },
    { value: 'Other', label: 'Other' },
    { value: 'Prefer not to say', label: 'Prefer not to say' }
  ];



  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });



  const removeCertification = (id: string) => {
    setCertifications(prev => prev.filter(cert => cert.id !== id));
  };

  const handleCertificationChange = (id: string, field: string, value: any) => {
    setCertifications((prev) =>
      prev.map((cert) => (cert.id === id ? { ...cert, [field]: value } : cert))
    );
  };


  useEffect(() => {
    if (submitStatus.type) {
      const timer = setTimeout(() => {
        setSubmitStatus({ type: null, message: '' });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [submitStatus]);

  const getStates = async () => {
    try {
      const resp = await getStatesByCountry();
      setStateOptions(resp);
    } catch (error) {
      console.log(error);
    }
  }

  const getSkillsData = async () => {
    try {
      const resp = await getSkills();
      setSkills(resp);
    } catch (error) {
      console.error('Error fetching skills:', error);
      setSkills([]);
    }
  }
  useEffect(() => {
    getStates();
    getSkillsData()
  }, [])

  useEffect(() => {
    if (!initialData?.skills || !Array.isArray(skills)) return;

    const availableSkillNames = skills.map(s => s.Skill.toLowerCase());

    const filteredSkills = initialData.skills.filter(skill =>
      availableSkillNames.includes(skill.toLowerCase())
    );

    setFormData(prev => ({
      ...prev,
      skills: filteredSkills
    }));
  }, [initialData?.skills, skills]);




  return (
    <div className="relative">


      {/* Loading Overlay */}
      {isSubmitting && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700">Submitting form...</p>
          </div>
        </div>
      )}

      {/* Certificate Overlay */}
      {certificateParsing && (
        <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center z-40">
          <div className="bg-white p-6 rounded-lg shadow-lg flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700">Please wait while we parse your certificate...</p>
          </div>
        </div>
      )}
      {/* certificate picker */}
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: "none" }}
        accept=".pdf,.jpg,.jpeg,.png,.bmp"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const certId = crypto.randomUUID();
          const defaultCert = {
            id: certId,
            name: '',
            file: file,
            certificateType: '',
            certificateFullName: '',
            nameOnLicense: '',
            issuedNo: '',
            issuedDate: '',
            expiryDate: '',
            issuedCenter: '',
          };

          setCertifications((prev) => [...prev, defaultCert]);
          setCertifcateParsing(true);

          try {
            const result = await parseCertificateWithGemini(file);
            setCertifications((prev) =>
              prev.map((c) =>
                c.id === certId
                  ? {
                    ...c,
                    ...result,
                    file,
                  }
                  : c
              )
            );
          } catch (err) {
            console.error("Parsing error:", err);
            alert("Failed to parse certificate. You can fill it manually.");
          } finally {
            e.target.value = '';
            setCertifcateParsing(false);
          }
        }}
      />



      <form onSubmit={(e) => handleSubmit(e, formData, certifications)} className="space-y-6" >
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-6 pb-2 border-b border-gray-200">
            Personal Information
          </h2>

          <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
            {/* Gender */}
            <div className="sm:col-span-2">
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700">
                Gender *
              </label>
              <select
                name="gender"
                id="gender"
                value={formData.gender}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
              >
                <option value="">Select Gender</option>
                {genderOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Name Fields */}
            <div className="sm:col-span-2">
              <label htmlFor="name.first" className="block text-sm font-medium text-gray-700">
                First Name *
              </label>
              <input
                type="text"
                name="name.first"
                id="name.first"
                value={formData.name.first}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="name.middle" className="block text-sm font-medium text-gray-700">
                Middle
              </label>
              <input
                type="text"
                name="name.middle"
                id="name.middle"
                value={formData.name.middle}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
              />
            </div>

            <div className="sm:col-span-1">
              <label htmlFor="name.last" className="block text-sm font-medium text-gray-700">
                Last Name *
              </label>
              <input
                type="text"
                name="name.last"
                id="name.last"
                value={formData.name.last}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
              />
            </div>

            {/* Contact Information */}
            <div className="sm:col-span-3">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
              />
            </div>

            <div className="sm:col-span-3">
              <label htmlFor="telephone" className="block text-sm font-medium text-gray-700">
                Telephone *
              </label>
              <input
                type="tel"
                name="telephone"
                id="telephone"
                value={formData.telephone}
                onChange={handleChange}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                required
              />
            </div>



            {/* Address */}
            <div className="sm:col-span-6 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Address</h3>
              <div className="grid grid-cols-1 gap-y-4 gap-x-6 sm:grid-cols-6">
                <div className="sm:col-span-2">
                  <label htmlFor="address.state" className="block text-sm font-medium text-gray-700">
                    State *
                  </label>
                  <select
                    name="address.state"
                    id="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  >
                    <option value="">Select State</option>
                    {stateOptions.map(state => (
                      <option key={state.State} value={state.State}>{state.State}</option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address.city" className="block text-sm font-medium text-gray-700">
                    City *
                  </label>
                  <input
                    type="text"
                    name="address.city"
                    id="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  />
                </div>

                <div className="sm:col-span-2">
                  <label htmlFor="address.zip" className="block text-sm font-medium text-gray-700">
                    ZIP Code
                  </label>
                  <input
                    type="text"
                    name="address.zip"
                    id="address.zip"
                    value={formData.address.zip}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
                <div className="sm:col-span-6">
                  <label htmlFor="address.address" className="block text-sm font-medium text-gray-700">Address line</label>
                  <input
                    type="text"
                    name="address.address"
                    id="address.address"
                    value={formData.address.address}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-6 mt-4 pt-4 border-t border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Professional Information</h3>
              <div className="grid grid-cols-2 gap-y-4 gap-x-6 ">
                <div className="sm:col-6 col-6">
                  <label htmlFor="workStatus" className="block text-sm font-medium text-gray-700">
                    Work Status *
                  </label>
                  <input
                    type="text"
                    name="workStatus"
                    id="workStatus"
                    value={formData.workStatus}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
                <div className="sm:col-6 col-6">
                  <label htmlFor="experience" className="block text-sm font-medium text-gray-700">
                    Experience *
                  </label>
                  <input
                    type="number"
                    name="experience"
                    id="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                    required
                  />
                </div>
              </div>

              {/* Skills Section */}
              <div className="sm:col-span-6 my-4 relative">
                <label htmlFor="skills" className="block text-sm font-medium text-gray-700">
                  Skills
                </label>
                <div className="relative mt-1">
                  <div className="relative">
                    <input
                      type="text"
                      name="skills"
                      id="skills"
                      value={skillsInput}
                      onChange={(e) => {
                        setSkillsInput(e.target.value);
                        setShowSkillSuggestions(true);
                      }}
                      onFocus={() => setShowSkillSuggestions(true)}
                      onBlur={() => setTimeout(() => setShowSkillSuggestions(false), 200)}
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
                      placeholder="Type to filter skills..."
                      autoComplete="off"
                    />
                  </div>
                  {showSkillSuggestions && skills && skills.length > 0 && (
                    <div className="absolute max-h-[10rem] mb-6 z-10 mt-1 w-full bg-white shadow-lg rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm overflow-auto">
                      {skills
                        .filter(skill =>
                          !formData?.skills?.some(s => s.toLowerCase() === skill.Skill?.toLowerCase()) &&
                          skill.Skill?.toLowerCase().includes(skillsInput.toLowerCase())
                        )
                        .map(skill => (
                          <div
                            key={skill.Skill}
                            className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setFormData(prev => ({
                                ...prev,
                                skills: [...prev.skills, skill.Skill]
                              }));
                              setSkillsInput('');
                            }}
                          >
                            {skill.Skill}
                          </div>
                        ))}

                    </div>
                  )}
                </div>
                {formData?.skills && formData?.skills?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {formData?.skills?.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-primary-extraLight text-primary-dark"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full text-primary hover:bg-primary-dark hover:text-white focus:outline-none focus:bg-primary-dark focus:text-white transition-colors"
                        >
                          <span className="sr-only">Remove {skill}</span>
                          <svg className="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                            <path strokeLinecap="round" strokeWidth="1.5" d="M1 1l6 6m0-6L1 7" />
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>




        {/* Certificates Section */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Certificates (Optional)
            </label>
            <button
              type="button"
              onClick={addCertification}
              className="text-sm text-primary hover:text-primary-dark font-medium flex items-center"
              disabled={isSubmitting || certifications.length >= 5}
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Certificates
            </button>
          </div>

          <div className="space-y-3">
            {certifications.map((cert) => (
              <div key={cert.id} className="flex items-start space-x-2 p-3 rounded-md">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-2">

                  <div>
                    <label htmlFor={`certificateFullName-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Certificate Full Name <span className="text-red-500">*</span>
                    </label>
                    <select
                      id={`certificateFullName-${cert.id}`}
                      value={cert.certificateFullName || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'certificateFullName', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      required
                    >
                      <option value="" disabled>
                        Select Certificate
                      </option>
                      {CERT_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>


                  <div>
                    <label htmlFor={`nameOnLicense-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Name on License
                    </label>
                    <input
                      id={`nameOnLicense-${cert.id}`}
                      type="text"
                      placeholder="Name on License"
                      value={cert.nameOnLicense || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'nameOnLicense', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label htmlFor={`issuedNo-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Issued Number
                    </label>
                    <input
                      id={`issuedNo-${cert.id}`}
                      type="text"
                      placeholder="Issued No"
                      value={cert.issuedNo || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'issuedNo', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label htmlFor={`issuedDate-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Issued Date
                    </label>
                    <input
                      id={`issuedDate-${cert.id}`}
                      type="date"
                      value={cert.issuedDate || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'issuedDate', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label htmlFor={`expiryDate-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Expiry Date
                    </label>
                    <input
                      id={`expiryDate-${cert.id}`}
                      type="date"
                      value={cert.expiryDate || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'expiryDate', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>

                  <div>
                    <label htmlFor={`issuedCenter-${cert.id}`} className="block text-sm font-medium text-gray-700">
                      Issued Center
                    </label>
                    <input
                      id={`issuedCenter-${cert.id}`}
                      type="text"
                      placeholder="Issued Center"
                      value={cert.issuedCenter || ''}
                      onChange={(e) => handleCertificationChange(cert.id, 'issuedCenter', e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeCertification(cert.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors mt-1"
                  disabled={isSubmitting}
                  aria-label="Remove certificate"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))}

          </div>
        </div>



        <div className="flex justify-between mt-6">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
            >
              Back
            </button>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="ml-auto px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Application'}
          </button>
        </div>
      </form>

    </div>
  );
}
