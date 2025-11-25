import React, { useState, useEffect, useCallback } from 'react';

// --- Global Constants for LLM API ---
const API_KEY = ""; // Leave as-is for the environment to provide
const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent";

// Image data for the slider (using placeholders)
const SLIDER_IMAGES = [
    { url: "/Image/img1.jpeg", alt: "Modern Drilling Rig in Action", caption: "Utilizing state-of-art machinery for precision drilling across diverse landscapes." },
    { url: "/Image/img2.jpeg", alt: "Successful Borewell Completion", caption: "Delivering reliable, clean water to agricultural, residential, and industrial clients." },
    { url: "/Image/img3.jpeg", alt: "Safety and Planning First", caption: "Rigorous safety protocols and geological planning ensure project success and longevity." },
];

// Company contact details
const COMPANY_CONTACT_DETAILS = {
    phone: "+91 98765 43210",
    email: "info@shreeramborwells.com",
    address: "Darbarpur Village, Near National Highway 8, Jaipur District, Rajasthan, 303303",
    // New Google Map URL targeting Darbarpur, Rajasthan (approximate coordinates)
    mapUrl: "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d113612.3551877964!2d75.76562544254452!3d26.54924734898165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x396c56b714524419%3A0x6e9f28d8b9d6a36f!2sDarbarpur%2C%20Rajasthan%20303303%2C%20India!5e0!3m2!1sen!2sin!4v1700680000000!5m2!1sen!2sin" 
};

// --- Initial Mock User Data (4 Super Admins, 10 Admins, + 1 Normal) ---
const INITIAL_USERS = [
    // Super Admins (4)
    { id: 1, role: 'Super Admin', name: 'Vivek Sharma', email: 'vivek.s@srb.com', password: 'sa' },
    { id: 2, role: 'Super Admin', name: 'Pooja Patel', email: 'pooja.p@srb.com', password: 'sa' },
    { id: 3, role: 'Super Admin', name: 'Amit Singh', email: 'amit.s@srb.com', password: 'sa' },
    { id: 4, role: 'Super Admin', name: 'Divya Rao', email: 'divya.r@srb.com', password: 'sa' },
    // General Admins (10)
    { id: 5, role: 'Admin', name: 'Ajay Kumar', email: 'ajay.k@srb.com', password: 'admin' }, 
    { id: 6, role: 'Admin', name: 'Priya Verma', email: 'priya.v@srb.com', password: 'admin' }, 
    { id: 7, role: 'Admin', name: 'Rahul Gupta', email: 'rahul.g@srb.com', password: 'admin' }, 
    { id: 8, role: 'Admin', name: 'Neha Reddy', email: 'neha.r@srb.com', password: 'admin' }, 
    { id: 9, role: 'Admin', name: 'Vikas Shah', email: 'vikas.s@srb.com', password: 'admin' }, 
    { id: 10, role: 'Admin', name: 'Komal Jha', email: 'komal.j@srb.com', password: 'admin' }, 
    { id: 11, role: 'Admin', name: 'Suresh Das', email: 'suresh.d@srb.com', password: 'admin' }, 
    { id: 12, role: 'Admin', name: 'Poonam Yadav', email: 'poonam.y@srb.com', password: 'admin' }, 
    { id: 13, role: 'Admin', name: 'Ali Khan', email: 'ali.k@srb.com', password: 'admin' }, 
    { id: 14, role: 'Admin', name: 'Deepa Iyer', email: 'deepa.i@srb.com', password: 'admin' },
    // Normal User (For testing redirection)
    { id: 15, role: 'Normal', name: 'Client User', email: 'client@srb.com', password: 'user' }
];

// --- Utility Functions (Omitted for brevity, assumed correct) ---
// Simple exponential backoff retry function for API calls
async function fetchWithRetry(url, options, maxRetries = 5) {
    for (let i = 0; i < maxRetries; i++) {
        try {
            const response = await fetch(url, options);
            if (response.status === 429 && i < maxRetries - 1) {
                const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`HTTP error! status: ${response.status} - ${errorBody}`);
            }
            return response;
        } catch (error) {
            if (i === maxRetries - 1) {
                throw error;
            }
        }
    }
}

// Helper to strip currency/commas and return a number
const cleanCurrencyToNumber = (value) => {
    return parseFloat(String(value).replace(/[^0-9.]/g, '') || 0);
};

// Helper to format a number into currency string (Indian Rupees)
const formatNumberToCurrency = (num) => {
    return `₹ ${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

// Function to calculate and format money
const calculateMoney = (total, given) => {
    const t = cleanCurrencyToNumber(total);
    const g = cleanCurrencyToNumber(given);
    const left = t - g;
    
    return {
        leftAmount: left, 
        leftMoney: formatNumberToCurrency(Math.max(0, left)), 
        totalCost: formatNumberToCurrency(t),
        costGiven: formatNumberToCurrency(g),
    };
};

// Function to generate the full CSV report
const generateCsvReport = (bores, expenses) => {
    const today = new Date().toISOString().split('T')[0];
    let csvContent = `Shree Ram Borwells Financial Report Generated On: ${today}\n\n`;

    csvContent += "--- REVENUE (BORE PROJECTS) ---\n";
    const boreHeaders = ["Project Name", "Date", "Size (Inch)", "Depth (ft)", "Total Cost (₹)", "Amount Given (₹)", "Amount Left (₹)", "Status", "Auditor Name"];
    csvContent += boreHeaders.join(",") + "\n";
    
    bores.forEach(bore => {
        const cleanTotal = cleanCurrencyToNumber(bore.totalCost);
        const cleanGiven = cleanCurrencyToNumber(bore.costGiven);
        const cleanLeft = cleanCurrencyToNumber(bore.leftMoney);
        
        const row = [
            `"${bore.name}"`, 
            bore.date,
            bore.size.replace(' inch', ''),
            bore.depth.replace(' ft', ''),
            cleanTotal,
            cleanGiven,
            cleanLeft,
            bore.status,
            `"${bore.auditorName}"`
        ];
        csvContent += row.join(",") + "\n";
    });

    csvContent += "\n--- EXPENSES ---\n";
    const expenseHeaders = ["Date", "Category", "Description", "Amount (₹)", "Auditor Name"];
    csvContent += expenseHeaders.join(",") + "\n";
    
    expenses.forEach(expense => {
        const row = [
            expense.date,
            expense.category,
            `"${expense.description}"`,
            expense.amount,
            `"${expense.auditorName}"` 
        ];
        csvContent += row.join(",") + "\n";
    });
    
    return csvContent;
};


// --- Icon Components (Omitted for brevity, assumed correct) ---
const HomeIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6-4a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1zm5 0a1 1 0 001-1v-1a1 1 0 10-2 0v1a1 1 0 001 1z" /></svg> );
const BoreIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg> );
const LockIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg> );
const ExpenseIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v1a1 1 0 01-1 1H9a1 1 0 01-1-1v-1m0 0h6m-6 0v-3a1 1 0 011-1h4a1 1 0 011 1v3m-3-10V4a1 1 0 00-1-1H7a1 1 0 00-1 1v3h8zm-1 0H9m-6 4h18M5 11h14M3 11v9a1 1 0 001 1h16a1 1 0 001-1v-9M3 11h18" /></svg> );
const UserGroupIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-2.37M17 20H7m10 0v-2c0-.653-.124-1.28-.356-1.87M7 20H2v-2a3 3 0 015.356-2.37M7 20v-2c0-.653.124-1.28.356-1.87m0 0A5.002 5.002 0 0112 13a5 5 0 014.644 3.13M12 13v-1m0 1a5 5 0 00-5 5v2h10v-2a5 5 0 00-5-5zM12 8a3 3 0 100-6 3 3 0 000 6z" /></svg> );
const LogoutIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg> );
const SparkleIcon = () => ( <svg className="w-5 h-5 text-yellow-300" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 10a4 4 0 11-8 0 4 4 0 018 0zm-7 0a3 3 0 10-6 0 3 3 0 006 0zM17 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm-4 4a1 1 0 011 1v1a1 1 0 11-2 0V7a1 1 0 011-1zm4 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1z" /></svg> );
const ClipboardIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg> );
const ChevronLeftIcon = () => ( <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg> );
const ChevronRightIcon = () => ( <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg> );
const PhoneIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.402 5.402l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg> );
const MailIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m-2 10a2 2 0 01-2 2H7a2 2 0 01-2-2V8a2 2 0 012-2h10a2 2 0 012 2v10z" /></svg> );
const LocationIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg> );
const ClockIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> );
const CheckIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> );
const TrashIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const DollarIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8v8m0-8h1.002C13.682 8 14 8.682 14 9.002V15c0 .32-.318.915-.998 1.002H12m0-8h-1.002C10.318 8 10 8.682 10 9.002V15c0 .32.318.915.998 1.002H12m0-8V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2h6a2 2 0 002-2v-2" /></svg> );
const TrendingUpIcon = ({className = "w-6 h-6"}) => ( <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> );
const TrendingDownIcon = ({className = "w-6 h-6"}) => ( <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" /></svg> );
const DownloadIcon = ({className = "w-6 h-6"}) => ( <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg> );
const TrashAltIcon = ({className = "w-6 h-6"}) => ( <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg> );
const StaffIcon = () => ( <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg> );
const EditIcon = () => ( <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-9-4l9-9m-7 16l-2-2"/></svg> );
const DrillIcon = ({ className = 'w-8 h-8' }) => ( <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m0-16h-3a3 3 0 00-3 3v10a3 3 0 003 3h6a3 3 0 003-3V7a3 3 0 00-3-3h-3zm0 16L9 16m3 4l3-4m-3 0V8"/></svg> );
const MenuIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg> );
const CloseIcon = () => ( <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> );


// Map Component (Now uses live iframe)
function MapEmbed() {
    return (
        <div className="w-full h-64 rounded-lg shadow-xl overflow-hidden">
            <iframe
                title="Shree Ram Borwells Location"
                src={COMPANY_CONTACT_DETAILS.mapUrl}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
        </div>
    );
}

// Image Slider Component (Omitted for brevity, assumed correct)
function ImageSlider() {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isHovered, setIsHovered] = useState(false);
    const slideInterval = 5000; 

    const nextSlide = useCallback(() => {
        setCurrentSlide(prev => (prev + 1) % SLIDER_IMAGES.length);
    }, []);

    const prevSlide = () => {
        setCurrentSlide(prev => (prev - 1 + SLIDER_IMAGES.length) % SLIDER_IMAGES.length);
    };

    useEffect(() => {
        if (!isHovered) {
            const timer = setInterval(nextSlide, slideInterval);
            return () => clearInterval(timer);
        }
    }, [isHovered, nextSlide]);

    const currentImage = SLIDER_IMAGES[currentSlide];

    return (
        <div 
            className="relative w-full h-[55vh] overflow-hidden rounded-xl shadow-2xl"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <img 
                src={currentImage.url} 
                alt={currentImage.alt} 
                className="w-full h-full object-cover transition-opacity duration-1000 ease-in-out"
                style={{ opacity: 1 }}
                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/1200x500/AAAAAA/333333?text=Image+Load+Error"; }}
            />

            <div className="absolute inset-0 bg-black bg-opacity-40 flex flex-col justify-end p-8">
                <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{currentImage.alt}</h2>
                <p className="text-lg md:text-xl text-white">{currentImage.caption}</p>
            </div>

            <button 
                onClick={prevSlide}
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 p-2 rounded-full text-white hover:bg-opacity-70 transition duration-300 focus:outline-none"
                aria-label="Previous Slide"
            ><ChevronLeftIcon /></button>
            <button 
                onClick={nextSlide}
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-30 p-2 rounded-full text-white hover:bg-opacity-70 transition duration-300 focus:outline-none"
                aria-label="Next Slide"
            ><ChevronRightIcon /></button>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
                {SLIDER_IMAGES.map((_, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentSlide ? 'bg-white w-8' : 'bg-white bg-opacity-50'
                        }`}
                        aria-label="Go to slide ${index + 1}"
                    />
                ))}
            </div>
        </div>
    );
}

// Public Header Component
function PublicHeader({ setCurrentPage }) {
  // Assuming logo.jpg is placed in the public folder, accessible via /logo.jpg
  const LOGO_URL = "/logo.jpg";
    
  return (
    <header className="bg-white shadow-md sticky top-0 z-10">
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        {/* Logo Element (Replaces DrillIcon and text) */}
        <div className="flex items-center">
            <img 
                src={LOGO_URL} 
                alt="Shree Ram Borwells Logo" 
                className="w-auto h-12 md:h-16 object-contain"
                onError={(e) => { 
                    e.target.onerror = null; 
                    e.target.style.display = 'none'; // Hide the broken image
                    e.target.parentElement.innerHTML = '<div class="flex items-center space-x-3"><span class="text-xl md:text-2xl font-extrabold text-blue-700">Shree Ram Borwells</span></div>';
                }}
            />
        </div>

        <div className="hidden md:flex space-x-6 items-center">
          <a href="#home" className="text-gray-600 hover:text-blue-600 font-semibold transition duration-200">Home</a>
          <a href="#gallery" className="text-gray-600 hover:text-blue-600 font-semibold transition duration-200">Highlights</a>
          <a href="#services" className="text-gray-600 hover:text-blue-600 font-semibold transition duration-200">Services</a>
          <a href="#contact" className="text-gray-600 hover:text-blue-600 font-semibold transition duration-200">Contact</a>
          <button
            onClick={() => setCurrentPage('login')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition duration-300 font-medium"
          >
            <LockIcon />
            <span>Admin Login</span>
          </button>
        </div>
        <div className="md:hidden">
          <button
            onClick={() => setCurrentPage('login')}
            className="flex items-center space-x-2 bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 transition duration-300"
          >
            <LockIcon />
          </button>
        </div>
      </nav>
    </header>
  );
}

// Public Site Component
function PublicSite({ setCurrentPage }) {
  return (
    <div className="font-sans text-gray-800">
      <PublicHeader setCurrentPage={setCurrentPage} />

      {/* Hero Section */}
      <section id="home" className="bg-blue-50 py-20 px-6">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4">
            Reliable Borewell Drilling & Water Solutions
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Shree Ram Borwells: Your trusted partner in deep borewell drilling, casing, and sustainable water sourcing, ensuring prosperity and clean supply.
          </p>
          <a href="#contact" className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-medium hover:bg-blue-700 transition duration-300 shadow-lg">
            Get a Free Consultation
          </a>
        </div>
      </section>
      
      {/* Image Slider Section */}
      <section id="gallery" className="py-20 px-6 bg-white">
          <div className="container mx-auto">
                <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Our Fleet & Project Highlights</h2>
                <p className="text-lg text-center text-gray-600 mb-10 max-w-3xl mx-auto">
                    View the powerful machinery and precision engineering we bring to every drilling location to guarantee quality and efficiency.
                </p>
                <ImageSlider />
          </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-20 px-6 bg-gray-50">
        <div className="container mx-auto">
          <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Our Specialized Services</h2>
          <p className="text-center text-lg text-gray-600 mb-10 max-w-3xl mx-auto">
            Shree Ram Borwells offers end-to-end water solutions, from initial surveys to installation and maintenance, ensuring sustainable results.
          </p>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300 text-center border-t-4 border-blue-600">
              <h3 className="text-2xl font-semibold mb-4 text-blue-800">Deep Borewell Drilling</h3>
              <p className="text-gray-600">Utilizing advanced rotary and hammering techniques for high-yield wells in all rock types, maximizing water discovery.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300 text-center border-t-4 border-blue-600">
              <h3 className="text-2xl font-semibold mb-4 text-blue-800">Pumping Solutions</h3>
              <p className="text-gray-600">Professional installation of reliable submersible and jet pumps, perfectly matched to borewell depth and flow capacity.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-lg hover:shadow-xl transition duration-300 text-center border-t-4 border-blue-600">
              <h3 className="text-2xl font-semibold mb-4 text-blue-800">Borewell Maintenance</h3>
              <p className="text-gray-600">Comprehensive flushing, cleaning, and preventative maintenance services to preserve water quality and prolong borewell life.</p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Contact Section */}
      <section id="contact" className="py-20 px-6">
        <div className="container mx-auto">
            <h2 className="text-4xl font-bold text-center mb-12 text-gray-900">Contact Us</h2>
            <div className="grid lg:grid-cols-2 gap-10">
                {/* Contact Form Column */}
                <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 order-2 lg:order-1">
                    <h3 className="text-2xl font-semibold text-blue-800 mb-6">Send an Inquiry</h3>
                    <form className="space-y-6">
                        <div><label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" id="name" required className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"/></div>
                        <div><label htmlFor="phone" className="block text-sm font-medium text-gray-700">Phone Number</label><input type="tel" id="phone" required className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"/></div>
                        <div><label htmlFor="message" className="block text-sm font-medium text-gray-700">Project Details / Inquiry</label><textarea id="message" rows="4" required className="mt-1 block w-full p-3 border border-gray-300 rounded-lg shadow-sm focus:border-blue-500 focus:ring-blue-500"></textarea></div>
                        <button type="submit" className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-300 shadow-md">Request a Free Consultation</button>
                    </form>
                </div>

                {/* Details & Map Column */}
                <div className="space-y-8 order-1 lg:order-2">
                    {/* Contact Details */}
                    <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-2xl font-semibold text-blue-800 mb-6">Our Details</h3>
                        <div className="space-y-4 text-gray-700">
                            <div className="flex items-start space-x-3"><PhoneIcon className="mt-1 flex-shrink-0 text-blue-600" /><div><p className="font-semibold">Phone (24/7 Service)</p><p className="hover:text-blue-600"><a href={`tel:${COMPANY_CONTACT_DETAILS.phone}`}>{COMPANY_CONTACT_DETAILS.phone}</a></p></div></div>
                            <div className="flex items-start space-x-3"><MailIcon className="mt-1 flex-shrink-0 text-blue-600" /><div><p className="font-semibold">Email for General Inquiries</p><p className="hover:text-blue-600"><a href={`mailto:${COMPANY_CONTACT_DETAILS.email}`}>{COMPANY_CONTACT_DETAILS.email}</a></p></div></div>
                            <div className="flex items-start space-x-3"><LocationIcon className="mt-1 flex-shrink-0 text-blue-600" /><div><p className="font-semibold">Office Address</p><p>{COMPANY_CONTACT_DETAILS.address}</p></div></div>
                            <div className="flex items-start space-x-3"><ClockIcon className="mt-1 flex-shrink-0 text-blue-600" /><div><p className="font-semibold">Working Hours</p><p>{COMPANY_CONTACT_DETAILS.hours}</p></div></div>
                        </div>
                    </div>

                    {/* Map Embed */}
                    <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200">
                        <h3 className="text-2xl font-semibold text-blue-800 mb-4">Our Location (Darbarpur, Rajasthan)</h3>
                        <MapEmbed />
                    </div>
                </div>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-12 px-6">
        <div className="container mx-auto text-center">
          <p>&copy; {new Date().getFullYear()} Shree Ram Borwells. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  );
}


// 2. Admin Login Page
function AdminLogin({ setCurrentPage, setLoggedInUser, users }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setLoginError('');

    // 1. Find user by email
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
        setLoginError('User not found. Check the email provided.');
        return;
    }

    // 2. Mock password check
    if (user.password !== password) {
        setLoginError('Incorrect password.');
        return;
    }

    // 3. Successful Login - Set the user object
    setLoggedInUser(user);

    // 4. Redirection Logic based on role
    if (user.role === 'Super Admin' || user.role === 'Admin') {
        setCurrentPage('dashboard');
    } else {
        // Normal person / Client redirection
        setCurrentPage('public');
        // Clear login fields after redirection
        setEmail('');
        setPassword('');
    }
  };

  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans">
      <div className="bg-white p-10 rounded-xl shadow-2xl w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-2">
          Staff & Client Login
        </h2>
        <p className="text-center text-gray-500 mb-8">Enter your credentials to access the system.</p>
        
        {/* Credentials Form (Primary Login Method) */}
        <form onSubmit={handleLogin} className="space-y-6">
          <div className="mb-4">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="email"
              id="email"
              placeholder="staff@srb.com or client@srb.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-6">
            <label className="block text-gray-700 font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              type="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          {loginError && (
              <p className="text-red-500 text-sm text-center mb-4 p-2 bg-red-50 border border-red-200 rounded-lg">{loginError}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition duration-300"
          >
            Login
          </button>
        </form>
        
        {/* Mock Credentials Hint (Only for development) */}
        <div className="mt-8 pt-4 border-t border-gray-200">
            <h4 className="text-lg font-semibold text-gray-800 mb-3">Mock Credentials (For Testing):</h4>
            <ul className="text-sm text-gray-600 space-y-1">
                <li>**Super Admin:** Emails start with `vivek.s@srb.com`, Pass: `sa`</li>
                <li>**General Admin:** Emails start with `ajay.k@srb.com`, Pass: `admin`</li>
                <li>**Normal Client:** Email: `client@srb.com`, Pass: `user`</li>
            </ul>
        </div>
          
        <button
            onClick={() => setCurrentPage('public')}
            className="w-full text-center text-blue-600 hover:underline mt-6"
        >
            &larr; Back to Public Site
        </button>
      </div>
    </div>
  );
}


// 3. SOW Generator Component (AI Feature)
function SOWGenerator({ projectName, isModalOpen, setIsModalOpen }) {
    const [clientName, setClientName] = useState('');
    const [projectType, setProjectType] = useState('Deep Borewell Drilling');
    const [length, setLength] = useState('500'); 
    const [soilType, setSoilType] = useState('Hard rock');
    
    const [output, setOutput] = useState('');
    const [sources, setSources] = useState([]);
    const [loading, setLoading] = useState(false);
    const [apiError, setApiError] = useState(''); 

    const handleGenerateSOW = async (e) => {
        e.preventDefault();
        setLoading(true);
        setApiError(''); 
        setOutput('');
        setSources([]);

        const systemPrompt = `Act as an expert technical sales engineer for Shree Ram Borwells, specializing in borewell drilling. Your task is to generate a professional, concise Statement of Work (SOW) outline based on the user's input. The response must be structured using Markdown headings (##, ###) and clear bullet points, relevant to modern borewell drilling practices. Do not include any introductory or concluding remarks outside the generated SOW content.`;
        const userQuery = `Draft an SOW outline for a new bore project titled "${projectName}". The client is ${clientName || 'TBD/Internal Reference'}. The specific service is ${projectType}. The required depth is ${length} feet. The known ground condition is ${soilType}. Focus on high-level scope, deliverables (including casing and pumping), and potential schedule phases.`;

        const payload = {
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] },
            tools: [{ "google_search": {} }], 
        };
        
        const apiKey = API_KEY;
        if (!apiKey) {
            setApiError('API Key is not configured for the generator.');
            setLoading(false);
            return;
        }

        try {
            const response = await fetchWithRetry(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await response.json();
            
            const candidate = result.candidates?.[0];

            if (candidate && candidate.content?.parts?.[0]?.text) {
              const text = candidate.content.parts[0].text;
              setOutput(text);
              
              let attributionSources = [];
              const groundingMetadata = candidate.groundingMetadata;
              if (groundingMetadata && groundingMetadata.groundingAttributions) {
                  attributionSources = groundingMetadata.groundingAttributions
                      .map(attribution => ({
                          uri: attribution.web?.uri,
                          title: attribution.web?.title,
                      }))
                      .filter(source => source.uri && source.title);
              }
              setSources(attributionSources);
            } else {
               setApiError('Could not generate the proposal. The response was empty or malformed.');
            }

        } catch (err) {
            setApiError('Failed to connect to the drafting service. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        try {
            navigator.clipboard.writeText(output);
        } catch (error) {
            const el = document.createElement('textarea');
            el.value = output;
            document.body.appendChild(el);
            document.execCommand('copy');
            document.body.removeChild(el);
        }
    };

    if (!isModalOpen) return null;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center">
                    <h3 className="text-2xl font-bold text-gray-800 flex items-center">
                        <SparkleIcon />
                        <span className="ml-2">Proposal Draft Generator for: {projectName}</span>
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-gray-800 text-3xl leading-none">&times;</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 grid md:grid-cols-2 gap-6">
                    <div className="flex flex-col space-y-4">
                        <h4 className="text-xl font-semibold border-b pb-2">1. Project Parameters</h4>
                        <input type="text" placeholder="Client Name (Optional for SOW)" value={clientName} onChange={(e) => setClientName(e.target.value)} className="p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                        <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className="p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500">
                            <option>Deep Borewell Drilling</option><option>Borewell Flushing & Cleaning</option><option>Submersible Pump Installation</option><option>Test Bore/Geological Survey</option>
                        </select>
                        <div className="flex space-x-2 items-center">
                            <input type="number" placeholder="Depth (e.g., 500)" value={length} onChange={(e) => setLength(e.target.value)} className="w-1/2 p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                            <span className="text-gray-500">feet (ft)</span>
                        </div>
                        <input type="text" placeholder="Ground/Soil Type (e.g., Hard rock, Alluvial, Basalt)" value={soilType} onChange={(e) => setSoilType(e.target.value)} className="p-3 border rounded-lg focus:ring-blue-500 focus:border-blue-500"/>
                        <button onClick={handleGenerateSOW} disabled={loading || !length} className="flex items-center justify-center space-x-2 bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-300 disabled:bg-green-300">
                            {loading ? (<><svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Drafting Proposal...</>) : (<><SparkleIcon /><span>Generate SOW Outline</span></>)}
                        </button>
                        {apiError && <p className="text-red-500 text-sm">{apiError}</p>}
                    </div>

                    <div className="flex flex-col space-y-4 bg-gray-50 p-4 rounded-lg border">
                        <h4 className="text-xl font-semibold border-b pb-2 flex justify-between items-center">
                            <span>2. Generated Draft</span>
                            {output && (<button onClick={handleCopy} className="flex items-center text-sm text-blue-600 hover:text-blue-800"><ClipboardIcon /><span className="ml-1">Copy</span></button>)}
                        </h4>
                        
                        <div className="flex-1 overflow-y-auto min-h-[200px] whitespace-pre-wrap text-gray-700">
                            {output ? (<pre className="font-sans text-sm whitespace-pre-wrap">{output}</pre>) : (<p className="text-gray-400 italic">Enter parameters and click "Generate" to create a preliminary SOW draft.</p>)}
                        </div>
                         {sources.length > 0 && (
                            <div className="text-xs text-gray-500 border-t pt-2">
                                <p className="font-semibold mb-1">Sources (via Google Search grounding):</p>
                                <ul className="list-disc ml-4 space-y-0.5">
                                    {sources.map((source, index) => (<li key={index}><a href={source.uri} target="_blank" rel="noopener noreferrer" className="hover:underline">{source.title}</a></li>))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Left Money Display Component (Omitted for brevity, assumed correct)
function LeftMoneyDisplay({ bore, editingId, setEditingId, paymentInput, setPaymentInput, handlePaymentUpdate, handlePaymentEditStart }) {
    const isPaid = bore.leftAmount <= 0;
    const leftMoneyClass = isPaid ? 'text-green-600' : 'text-red-600';
    const isEditing = editingId === bore.id;
    
    if (bore.status !== 'Complete') {
        return (<span className={`font-bold ${leftMoneyClass}`}>Left: {bore.leftMoney}</span>);
    }
    if (bore.status === 'Complete' && isPaid) {
        return (<span className={`font-bold ${leftMoneyClass}`}>Paid in Full</span>);
    }
    if (isEditing) {
        return (
            <form onSubmit={(e) => { e.preventDefault(); handlePaymentUpdate(bore.id); }} className="flex space-x-2 items-center">
                <input type="text" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value.replace(/[^0-9.]/g, ''))} placeholder="Amount" className="w-32 p-1 border rounded-lg text-sm focus:border-blue-500 focus:ring-1" required autoFocus/>
                <button type="submit" className="bg-blue-500 text-white text-xs px-2 py-1 rounded-lg hover:bg-blue-600">Add Pay</button>
                <button type="button" onClick={() => setEditingId(null)} className="text-gray-500 text-xs hover:text-gray-800">Cancel</button>
            </form>
        );
    }
    return (
        <button 
            onClick={() => handlePaymentEditStart(bore.id, bore.leftMoney)}
            className={`font-bold ${leftMoneyClass} flex items-center space-x-1 p-1 rounded hover:bg-red-50`}
        >
            <DollarIcon className="w-4 h-4 text-red-500"/>
            <span>Left: {bore.leftMoney} (Pay)</span>
        </button>
    );
}

// 4. Bore Section Component
function BoreSection({ bores, setBores, openSowModal, loggedInUserName }) { 
    
    const initializeBore = (id, name, size, depth, date, total, given, status, auditorName) => {
        const calculated = calculateMoney(total, given);
        return { id, name, size, depth: `${depth} ft`, date, totalCost: calculated.totalCost, costGiven: calculated.costGiven, leftMoney: calculated.leftMoney, leftAmount: calculated.leftAmount, status, auditorName };
    };

    const [newBore, setNewBore] = useState({ name: '', size: '', depth: '', date: '', totalCost: '', costGiven: '' });
    const [editingId, setEditingId] = useState(null);
    const [paymentInput, setPaymentInput] = useState('');

    const handleAddBore = (e) => {
        e.preventDefault();
        if (!newBore.name || !newBore.size || !newBore.date || !newBore.totalCost || !newBore.costGiven) return;

        const newEntry = initializeBore(Date.now(), newBore.name, newBore.size, cleanCurrencyToNumber(newBore.depth), newBore.date, newBore.totalCost, newBore.costGiven, 'Planning', loggedInUserName);

        setBores([newEntry, ...bores]);
        setNewBore({ name: '', size: '', depth: '', date: '', totalCost: '', costGiven: '' });
    };

    const toggleStatus = (id) => {
        setBores(bores.map(bore => bore.id === id ? { ...bore, status: bore.status === 'Complete' ? 'Active' : 'Complete' } : bore));
    };

    const handleDelete = (id) => {
        setBores(bores.filter(bore => bore.id !== id));
    };
    
    const handlePaymentUpdate = (id) => {
        const payment = cleanCurrencyToNumber(paymentInput);
        if (payment <= 0) { setEditingId(null); return; }

        setBores(bores.map(bore => {
            if (bore.id === id) {
                const existingGiven = cleanCurrencyToNumber(bore.costGiven);
                const newGivenAmount = existingGiven + payment;
                const newCalculated = calculateMoney(bore.totalCost, newGivenAmount);

                return { ...bore, costGiven: newCalculated.costGiven, leftMoney: newCalculated.leftMoney, leftAmount: newCalculated.leftAmount };
            }
            return bore;
        }));
        
        setEditingId(null);
        setPaymentInput('');
    };
    
    const handlePaymentEditStart = (id, currentLeft) => {
        setEditingId(id);
        setPaymentInput(String(cleanCurrencyToNumber(currentLeft)));
    };


    const activeBores = bores.filter(b => b.status !== 'Complete').sort((a, b) => b.id - a.id);
    const completedBores = bores.filter(b => b.status === 'Complete').sort((a, b) => b.id - a.id);

    const getStatusColor = (status) => {
        switch (status) {
            case 'Active': return 'bg-yellow-100 text-yellow-800';
            case 'Complete': return 'bg-green-100 text-green-800';
            case 'Planning': return 'bg-blue-100 text-blue-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    

    return (
        <div className="space-y-10">
            {/* 1. Add New Bore Form (Mobile responsive grid) */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
                <h3 className="text-2xl font-semibold mb-4 text-blue-800">Register New Bore Project (Auditor: {loggedInUserName})</h3>
                <form onSubmit={handleAddBore} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-1 lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Project Name</label><input type="text" value={newBore.name} onChange={(e) => setNewBore({ ...newBore, name: e.target.value })} placeholder="e.g., Site A, V. Kumar" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Size (Inch)</label><input type="text" value={newBore.size} onChange={(e) => setNewBore({ ...newBore, size: e.target.value })} placeholder="e.g., 6.5" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Est. Depth (ft)</label><input type="number" value={newBore.depth} onChange={(e) => setNewBore({ ...newBore, depth: e.target.value })} placeholder="e.g., 500" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Start Date</label><input type="date" value={newBore.date} onChange={(e) => setNewBore({ ...newBore, date: e.target.value })} className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    <div className="md:col-span-1 lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Total Cost (₹)</label><input type="text" value={newBore.totalCost} onChange={(e) => setNewBore({ ...newBore, totalCost: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="e.g., 250000" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    <div className="md:col-span-1 lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Cost Given (₹)</label><input type="text" value={newBore.costGiven} onChange={(e) => setNewBore({ ...newBore, costGiven: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="e.g., 150000" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                     <div className="md:col-span-1 lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Left Money (Calculated)</label><input type="text" value={calculateMoney(newBore.totalCost, newBore.costGiven).leftMoney} disabled className="mt-1 block w-full p-2 border border-gray-300 rounded-lg bg-gray-100 text-blue-700 font-bold"/></div>
                    <button type="submit" className="col-span-full bg-green-600 text-white p-2 rounded-lg font-semibold hover:bg-green-700 transition mt-4">Add New Bore</button>
                </form>
            </div>

            {/* 2. Active Bores List */}
            <div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Active / Planning Bores ({activeBores.length})</h3>
                <div className="space-y-3">
                    {activeBores.map(bore => (
                        <div key={bore.id} className="bg-white p-4 rounded-xl shadow-md flex flex-col md:flex-row items-start md:items-center justify-between transition hover:shadow-lg">
                            <div className="flex-1 min-w-0 w-full mb-2 md:mb-0">
                                <p className="font-bold text-lg text-blue-800 truncate">{bore.name}</p>
                                <div className="text-xs italic text-gray-400 mb-2 md:hidden">Added by: {bore.auditorName}</div>
                                <div className="text-sm text-gray-600 grid grid-cols-2 sm:grid-cols-3 gap-2 md:flex md:space-x-4 md:flex-wrap">
                                    <span className="font-medium">Size: {bore.size}</span>
                                    <span className="font-medium">Depth: {bore.depth}</span>
                                    <span className="font-medium hidden md:inline">Date: {bore.date}</span>
                                    <span className="font-semibold text-green-700 col-span-2 md:col-span-auto">Total: {bore.totalCost}</span>
                                    <span className="font-semibold text-green-700 col-span-2 md:col-span-auto">Given: {bore.costGiven}</span>
                                    <span className="hidden md:inline text-xs italic text-gray-400 ml-4">Added by: {bore.auditorName}</span>
                                </div>
                            </div>
                            <div className="w-full md:w-auto mt-3 md:mt-0 flex flex-wrap justify-end items-center space-x-2">
                                <LeftMoneyDisplay bore={bore} editingId={editingId} setEditingId={setEditingId} paymentInput={paymentInput} setPaymentInput={setPaymentInput} handlePaymentUpdate={handlePaymentUpdate} handlePaymentEditStart={handlePaymentEditStart}/>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(bore.status)}`}>{bore.status}</span>
                                <button onClick={() => openSowModal(bore.name)} title="Generate SOW Draft" className="p-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600 transition"><SparkleIcon className="w-5 h-5 text-white" /></button>
                                <button onClick={() => toggleStatus(bore.id)} title="Mark as Complete" className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 transition"><CheckIcon /></button>
                                <button onClick={() => handleDelete(bore.id)} title="Delete Bore Entry" className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition"><TrashIcon /></button>
                            </div>
                        </div>
                    ))}
                    {activeBores.length === 0 && (<p className="text-center text-gray-500 py-4 border rounded-lg bg-gray-50">No active bores. Time to start a new project!</p>)}
                </div>
            </div>

            {/* 3. Completed Bores List */}
            <div className="border-t pt-6">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Completed Bores ({completedBores.length})</h3>
                <div className="space-y-3 opacity-90">
                    {completedBores.map(bore => (
                         <div key={bore.id} className="bg-gray-100 p-4 rounded-xl shadow-inner flex flex-col md:flex-row items-start md:items-center justify-between">
                            <div className="flex-1 min-w-0 w-full mb-2 md:mb-0">
                                <p className={`font-bold text-lg text-gray-800 truncate ${bore.leftAmount <= 0 ? 'line-through text-gray-500' : 'text-red-700'}`}>{bore.name}</p>
                                <div className="text-xs italic text-gray-400 mb-2 md:hidden">Added by: {bore.auditorName}</div>
                                <div className="text-sm text-gray-600 grid grid-cols-2 sm:grid-cols-3 gap-2 md:flex md:space-x-4 md:flex-wrap">
                                    <span className="font-medium">Size: {bore.size}</span>
                                    <span className="font-medium">Depth: {bore.depth}</span>
                                    <span className="font-medium hidden md:inline">Date: {bore.date}</span>
                                    <span className="font-semibold text-green-700 col-span-2 md:col-span-auto">Total: {bore.totalCost}</span>
                                    <span className="font-semibold text-green-700 col-span-2 md:col-span-auto">Given: {bore.costGiven}</span>
                                    <span className="hidden md:inline text-xs italic text-gray-400 ml-4">Added by: {bore.auditorName}</span>
                                </div>
                            </div>
                            <div className="w-full md:w-auto mt-3 md:mt-0 flex flex-wrap justify-end items-center space-x-2">
                                <LeftMoneyDisplay bore={bore} editingId={editingId} setEditingId={setEditingId} paymentInput={paymentInput} setPaymentInput={setPaymentInput} handlePaymentUpdate={handlePaymentUpdate} handlePaymentEditStart={handlePaymentEditStart}/>
                                <span className={`text-xs font-medium px-3 py-1 rounded-full ${getStatusColor(bore.status)}`}>Complete</span>
                                <button onClick={() => toggleStatus(bore.id)} title="Re-open Bore" className="p-2 bg-gray-500 text-white rounded-full hover:bg-gray-600 transition"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356-2A8.001 8.001 0 004.582 18m2.185-4.5h.582m-2.185 0A8.001 8.001 0 0119.418 6m-2.185 4.5h-.582m2.185 0A8.001 8.001 0 0119.418 6m-2.185 4.5h-.582" /></svg></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// 5. Expense Card Helper Component
const ExpenseCard = ({ title, value, colorClass, icon }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-gray-200">
        <div className="flex justify-between items-start">
            <p className="text-lg font-medium text-gray-500 uppercase">{title}</p>
            {icon}
        </div>
        <p className={`text-4xl font-extrabold mt-2 ${colorClass}`}>
            {formatNumberToCurrency(value)}
        </p>
    </div>
);


// 6. Expense Section Component
function ExpenseDashboard({ bores, expenses, setExpenses, userRole, loggedInUserName }) { 
    
    const [newExpense, setNewExpense] = useState({ date: '', category: 'Diesel', description: '', amount: '' });
    const isSuperAdmin = userRole === 'Super Admin';

    // --- Financial Calculations ---
    const totalRevenue = bores.reduce((sum, bore) => sum + cleanCurrencyToNumber(bore.costGiven), 0);
    const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    const moneyInPocket = totalRevenue - totalExpenses;
    
    const moneyInPocketColor = moneyInPocket >= 0 ? 'text-green-600' : 'text-red-600';
    const moneyInPocketIcon = moneyInPocket >= 0 ? <TrendingUpIcon className="w-8 h-8 text-green-600"/> : <TrendingDownIcon className="w-8 h-8 text-red-600"/>;


    const handleAddExpense = (e) => {
        e.preventDefault();
        if (!newExpense.date || !newExpense.category || !newExpense.amount) return;
        
        const amountNum = cleanCurrencyToNumber(newExpense.amount);
        if (amountNum <= 0) return;

        const newEntry = {
            id: Date.now(),
            date: newExpense.date,
            category: newExpense.category,
            description: newExpense.description || newExpense.category,
            amount: amountNum,
            formattedAmount: formatNumberToCurrency(amountNum),
            auditorName: loggedInUserName, // Set auditor name
        };

        setExpenses([newEntry, ...expenses]);
        setNewExpense({ date: '', category: 'Diesel', description: '', amount: '' });
    };

    const handleDeleteExpense = (id) => {
        setExpenses(expenses.filter(expense => expense.id !== id));
    };

    return (
        <div className="space-y-10">
            {/* 1. Financial Dashboard Summary - Visible only to Super Admin */}
            {isSuperAdmin && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <ExpenseCard title="Total Revenue (Money In)" value={totalRevenue} colorClass="text-blue-600" icon={<TrendingUpIcon className="w-8 h-8 text-blue-600"/>}/>
                    <ExpenseCard title="Total Expenses (Money Out)" value={totalExpenses} colorClass="text-red-600" icon={<TrendingDownIcon className="w-8 h-8 text-red-600"/>}/>
                    <ExpenseCard title="Money in Pocket (Net)" value={moneyInPocket} colorClass={moneyInPocketColor} icon={moneyInPocketIcon}/>
                </div>
            )}
            
            {/* Display message if Admin */}
            {!isSuperAdmin && (
                 <div className="p-4 bg-blue-100 border-l-4 border-blue-500 text-blue-800 rounded-lg">
                    <p className="font-semibold">Financial Summary Hidden:</p>
                    <p className="text-sm">Only Super Administrators can view the total revenue, expenses, and net profit dashboard.</p>
                </div>
            )}

            {/* 2. Add New Expense Form (Mobile responsive grid) */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-red-600">
                <h3 className="text-2xl font-semibold mb-4 text-red-700">Record New Expense (Auditor: {loggedInUserName})</h3>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
                    
                    <div><label className="block text-sm font-medium text-gray-700">Date</label><input type="date" value={newExpense.date} onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })} className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Category</label><select value={newExpense.category} onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })} className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required><option>Diesel</option><option>Tyres</option><option>Bits</option><option>Pipe/Casing</option><option>Labour</option><option>Other</option></select></div>

                    <div className="sm:col-span-2 lg:col-span-2"><label className="block text-sm font-medium text-gray-700">Description / Project</label><input type="text" value={newExpense.description} onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })} placeholder="e.g., Rig 2 Refill or Sharma Farm Casing" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg"/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Amount (₹)</label><input type="text" value={newExpense.amount} onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value.replace(/[^0-9.]/g, '') })} placeholder="e.g., 15000" className="mt-1 block w-full p-2 border border-gray-300 rounded-lg" required/></div>
                    
                    <button type="submit" className="sm:col-span-2 lg:col-span-1 bg-red-600 text-white p-2 rounded-lg font-semibold hover:bg-red-700 transition">Record Expense</button>
                </form>
            </div>

            {/* 3. Expense List */}
            <div className="border-t pt-6">
                <h3 className="text-2xl font-semibold mb-4 text-gray-800">Recent Expenses ({expenses.length})</h3>
                <div className="space-y-3">
                    {expenses.length === 0 && (<p className="text-center text-gray-500 py-4 border rounded-lg bg-gray-50">No expenses recorded yet.</p>)}
                    {expenses.map(expense => (
                        <div key={expense.id} className="bg-white p-4 rounded-xl shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between hover:shadow-lg transition">
                            <div className="flex-1 min-w-0 w-full mb-2 sm:mb-0">
                                <p className="font-bold text-lg text-gray-800 truncate">{expense.description}</p>
                                <div className="text-sm text-gray-600 flex flex-wrap gap-x-4">
                                    <span className="font-medium text-red-700">{expense.category}</span>
                                    <span>Date: {expense.date}</span>
                                    <span className="text-xs italic text-gray-400">Added by: {expense.auditorName}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3 ml-0 sm:ml-4 flex-shrink-0 w-full sm:w-auto justify-end">
                                <span className="font-extrabold text-red-600 text-xl">{expense.formattedAmount}</span>
                                <button onClick={() => handleDeleteExpense(expense.id)} title="Delete Expense" className="p-1 bg-gray-200 text-red-500 rounded-full hover:bg-red-100 transition"><TrashIcon className="w-5 h-5" /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// User Management Component (CRUD)
function UserManagement({ users, setUsers }) {
    const [editingUser, setEditingUser] = useState(null);
    const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Admin', password: 'admin' });

    const admins = users.filter(u => u.role === 'Admin');
    const superAdmins = users.filter(u => u.role === 'Super Admin');

    const handleSaveUser = (e) => {
        e.preventDefault();
        const emailExists = users.some(u => u.email === (editingUser || newUser).email && u.id !== (editingUser ? editingUser.id : null));

        if (emailExists) {
            alert('Email already exists!');
            return;
        }

        if (editingUser) {
            setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
            setEditingUser(null);
        } else {
            const newId = Math.max(...users.map(u => u.id)) + 1;
            setUsers([...users, { ...newUser, id: newId, password: 'admin' }]); 
            setNewUser({ name: '', email: '', role: 'Admin', password: 'admin' });
        }
    };

    const handleDeleteUser = (id) => {
        if (window.confirm('Are you sure you want to delete this user?')) {
            setUsers(users.filter(u => u.id !== id));
        }
    };

    const handleEditStart = (user) => {
        setEditingUser(user);
    };
    
    const handleEditChange = (field, value) => {
        setEditingUser({...editingUser, [field]: value});
    };
    
    const handleNewChange = (field, value) => {
        setNewUser({...newUser, [field]: value});
    };

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-bold text-gray-800">User Management (Super Admin Access)</h2>
            <p className="text-gray-600">Create, Read, Update, and Delete operational Admin accounts. Super Admin accounts cannot be modified here.</p>

            {/* Edit/Create Modal/Form */}
            <div className="bg-white p-6 rounded-xl shadow-lg border-t-4 border-blue-600">
                <h3 className="text-xl font-semibold mb-4 text-blue-800">{editingUser ? `Editing: ${editingUser.name}` : 'Add New Admin Account'}</h3>
                <form onSubmit={handleSaveUser} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium text-gray-700">Full Name</label><input type="text" value={editingUser ? editingUser.name : newUser.name} onChange={(e) => editingUser ? handleEditChange('name', e.target.value) : handleNewChange('name', e.target.value)} className="mt-1 block w-full p-2 border rounded-lg" required/></div>
                    <div><label className="block text-sm font-medium text-gray-700">Email</label><input type="email" value={editingUser ? editingUser.email : newUser.email} onChange={(e) => editingUser ? handleEditChange('email', e.target.value) : handleNewChange('email', e.target.value)} className="mt-1 block w-full p-2 border rounded-lg" required/></div>
                     <div><label className="block text-sm font-medium text-gray-700">Role</label><select value={editingUser ? editingUser.role : newUser.role} onChange={(e) => editingUser ? handleEditChange('role', e.target.value) : handleNewChange('role', e.target.value)} className="mt-1 block w-full p-2 border rounded-lg" disabled={editingUser && editingUser.role === 'Super Admin'}><option>Admin</option><option disabled={!editingUser || editingUser.role !== 'Super Admin'}>Super Admin</option></select></div>
                    <div><label className="block text-sm font-medium text-gray-700">Password (Mock)</label><input type="text" value={editingUser ? editingUser.password : newUser.password} onChange={(e) => editingUser ? handleEditChange('password', e.target.value) : handleNewChange('password', e.target.value)} className="mt-1 block w-full p-2 border rounded-lg" required/></div>
                    <div className="col-span-full flex justify-end space-x-3 mt-2">
                        {editingUser && (<button type="button" onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg hover:bg-gray-400 transition">Cancel Edit</button>)}
                        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
                            {editingUser ? 'Update User' : 'Add User'}
                        </button>
                    </div>
                </form>
            </div>

            {/* User List */}
            <div className="grid md:grid-cols-2 gap-6">
                
                {/* Super Admin List (Read Only) */}
                <div>
                    <h3 className="text-xl font-semibold mb-3 text-red-700">Super Admins ({superAdmins.length})</h3>
                    <div className="space-y-2">
                        {superAdmins.map(user => (
                            <div key={user.id} className="p-3 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center text-red-800">
                                <div><p className="font-medium">{user.name}</p><p className="text-xs">{user.email}</p></div>
                                <span className="text-xs font-bold px-2 py-1 rounded-full bg-red-200">MASTER</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* General Admin List (CRUD) */}
                <div>
                    <h3 className="text-xl font-semibold mb-3 text-blue-700">General Admins ({admins.length})</h3>
                    <div className="space-y-2">
                        {admins.map(user => (
                            <div key={user.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
                                <div><p className="font-medium">{user.name}</p><p className="text-xs text-gray-500">{user.email}</p></div>
                                <div className="space-x-2 flex items-center">
                                    <button onClick={() => handleEditStart(user)} className="p-1.5 bg-yellow-400 text-white rounded-full hover:bg-yellow-500 transition" title="Edit User"><EditIcon /></button>
                                    <button onClick={() => handleDeleteUser(user.id)} className="p-1.5 bg-red-400 text-white rounded-full hover:bg-red-500 transition" title="Delete User"><TrashIcon /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}


// 7. Admin Dashboard
function AdminDashboard({ setCurrentPage, setLoggedInUser, loggedInUser, users, setUsers, setBores, setExpenses, bores, expenses }) {
  
    const isSuperAdmin = loggedInUser.role === 'Super Admin';
    const loggedInUserName = loggedInUser.name;

    const [adminPage, setAdminPage] = useState('dashboard');
    const [isSowModalOpen, setIsSowModalOpen] = useState(false);
    const [selectedProjectName, setSelectedProjectName] = useState('');
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false); 
    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

    const handleLogout = () => {
      setLoggedInUser(null);
      setCurrentPage('public');
    };
    
    const openSowModal = (projectName) => {
        setSelectedProjectName(projectName);
        setIsSowModalOpen(true);
    };
    
    const handleClearData = () => {
        setBores([]);
        setExpenses([]);
        setIsConfirmModalOpen(false);
    };

    // --- CSV Download Handler (Omitted for brevity, assumed correct) ---
    const handleDownloadReport = () => {
        const csvData = generateCsvReport(bores, expenses);
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `ShreeRamBorwells_Report_${dateStr}.csv`;
        
        const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        
        if (link.download !== undefined) { 
            const url = URL.createObjectURL(blob);
            link.setAttribute("href", url);
            link.setAttribute("download", filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }
    };

    // Confirmation Modal Component (Omitted for brevity, assumed correct)
    const ConfirmClearModal = () => {
      if (!isConfirmModalOpen) return null;

      return (
          <div className="fixed inset-0 bg-gray-900 bg-opacity-70 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-8">
                  <h3 className="text-2xl font-bold text-red-600 mb-4 flex items-center">
                      <TrashAltIcon className="w-6 h-6 mr-2" />
                      Confirm Data Archive & Reset
                  </h3>
                  <p className="text-gray-700 mb-6">
                      **WARNING:** This action will permanently **DELETE ALL** Project Data (Active/Completed Bores) and **ALL** Expense Records from the application. You should **ALWAYS** download a CSV report before proceeding.
                  </p>
                  <div className="flex justify-end space-x-4">
                      <button onClick={() => setIsConfirmModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition">Cancel / Keep Data</button>
                      <button onClick={handleClearData} className="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition">Yes, Delete All Data</button>
                  </div>
              </div>
          </div>
      );
    };
    
    // Helper function for nav item click
    const handleNavClick = (page) => {
        setAdminPage(page);
        setIsSidebarOpen(false); // Close sidebar on mobile after click
    };

    // --- Sidebar Navigation Component (Responsive) ---
    const Sidebar = ({ mobile=false }) => (
        <nav className={`${mobile ? 'w-full' : 'w-64'} bg-gray-800 text-gray-200 p-6 flex flex-col h-full`}>
            <div className="text-2xl font-bold mb-10">{mobile && <span className='text-red-400'>SRB</span>} Admin Panel</div>
            <ul className="space-y-3 flex-1">
                <li><button onClick={() => handleNavClick('dashboard')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${adminPage === 'dashboard' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}><HomeIcon /> <span>Dashboard</span></button></li>
                <li><button onClick={() => handleNavClick('bores')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${adminPage === 'bores' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}><BoreIcon /> <span>Bore Section</span></button></li>
                <li><button onClick={() => handleNavClick('expenses')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${adminPage === 'expenses' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}><ExpenseIcon /> <span>Expense Tracker</span></button></li>
                
                {isSuperAdmin && (
                    <li><button onClick={() => handleNavClick('users')} className={`flex items-center space-x-3 w-full p-3 rounded-lg ${adminPage === 'users' ? 'bg-blue-600 text-white' : 'hover:bg-gray-700'}`}><UserGroupIcon /> <span>Manage Users & Teams</span></button></li>
                )}
            </ul>
            <div className="mt-auto">
                <button onClick={handleLogout} className="flex items-center space-x-3 w-full p-3 rounded-lg text-gray-400 hover:bg-red-600 hover:text-white"><LogoutIcon /> <span>Logout</span></button>
            </div>
        </nav>
    );

    return (
      <div className="flex min-h-screen bg-gray-100 font-sans">
        
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
            <Sidebar />
        </div>
        
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
            <div className="fixed inset-0 z-50 bg-gray-900 bg-opacity-75 md:hidden">
                <div className="absolute left-0 top-0 w-3/4 h-full">
                    <Sidebar mobile={true} />
                </div>
                <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 text-white p-2">
                    <CloseIcon className='w-8 h-8' />
                </button>
            </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-10">
            {/* Header Bar for Mobile */}
            <div className="flex justify-between items-center mb-6 md:mb-8 bg-white p-3 rounded-lg shadow md:shadow-none md:bg-transparent">
                <button 
                    onClick={() => setIsSidebarOpen(true)}
                    className="md:hidden p-2 text-gray-800 rounded-full hover:bg-gray-200"
                >
                    <MenuIcon />
                </button>
                <h1 className="text-xl md:text-4xl font-bold text-gray-800 flex-1 ml-4 md:ml-0">
                    {adminPage === 'dashboard' && 'Dashboard'}
                    {adminPage === 'bores' && 'Bore Section'}
                    {adminPage === 'expenses' && 'Expense Tracker'}
                    {adminPage === 'users' && 'Manage Users'}
                </h1>
                <div className="text-right text-xs md:text-sm">
                    <p className="text-gray-600">Logged in as:</p>
                    <span className="font-semibold text-blue-600">{loggedInUser.name} ({loggedInUser.role})</span>
                </div>
            </div>

          {/* Page Content (Conditional Rendering) */}
          <div className="bg-white p-4 md:p-8 rounded-xl shadow-lg">
            {adminPage === 'dashboard' && (
              <div>
                <h2 className="text-2xl font-semibold mb-4">Welcome, {loggedInUserName}!</h2>
                <p className="text-gray-600 mb-6">
                  {isSuperAdmin ? 'You have full access to all data, management, and system maintenance.' : 'You have operational access to manage projects and track expenses.'}
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-4">
                    {/* Financial Reporting Column */}
                    <div className={`${isSuperAdmin ? 'md:border-r md:pr-4' : 'col-span-1'} pb-4 md:pb-0`}>
                        <h3 className="text-xl font-semibold mb-3 text-blue-700">Financial Reporting</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Download all current records (Revenue and Expenses) for external archival.
                        </p>
                        <button onClick={handleDownloadReport} className="flex items-center justify-center space-x-2 bg-green-600 text-white px-5 py-2 rounded-lg hover:bg-green-700 transition duration-300 font-medium w-full"><DownloadIcon className="w-5 h-5" /><span>Download Report (CSV)</span></button>
                    </div>
                    
                    {/* Data Reset Column - Only visible to Super Admin */}
                    {isSuperAdmin && (
                        <div className="md:pl-4 border-t pt-4 md:border-t-0 md:pt-0">
                            <h3 className="text-xl font-semibold mb-3 text-red-700">System Maintenance</h3>
                            <p className="text-sm text-gray-600 mb-4">
                                Use this to clear all records after archival. **This action is irreversible.**
                            </p>
                            <button onClick={() => setIsConfirmModalOpen(true)} className="flex items-center justify-center space-x-2 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition duration-300 font-medium w-full"><TrashAltIcon className="w-5 h-5" /><span>Clear All Data</span></button>
                        </div>
                    )}
                </div>
              </div>
            )}

            {adminPage === 'bores' && (<BoreSection bores={bores} setBores={setBores} openSowModal={openSowModal} loggedInUserName={loggedInUserName} />)}
            {adminPage === 'expenses' && (<ExpenseDashboard bores={bores} expenses={expenses} setExpenses={setExpenses} userRole={loggedInUser.role} loggedInUserName={loggedInUserName} />)}

            {adminPage === 'users' && isSuperAdmin && (<UserManagement users={users} setUsers={setUsers} />)}
            
            {adminPage === 'users' && !isSuperAdmin && (
                 <div className="p-6 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-lg">
                     <h2 className="text-xl font-bold mb-2">Access Denied</h2>
                     <p>You do not have the required **Super Admin** privileges to view the User Management section.</p>
                 </div>
            )}

          </div>
        </main>
        
        {/* Modals */}
        <SOWGenerator 
            projectName={selectedProjectName}
            isModalOpen={isSowModalOpen}
            setIsModalOpen={setIsSowModalOpen}
        />
        <ConfirmClearModal />
      </div>
    );
}


// Main App Component
export default function App() {
  const [currentPage, setCurrentPage] = useState('public');
  const [loggedInUser, setLoggedInUser] = useState(null); 
  
  // --- Centralized User/Data State ---
  const initializeBore = (id, name, size, depth, date, total, given, status, auditorName) => {
        const calculated = calculateMoney(total, given);
        return { id, name, size, depth: `${depth} ft`, date, totalCost: calculated.totalCost, costGiven: calculated.costGiven, leftMoney: calculated.leftMoney, leftAmount: calculated.leftAmount, status, auditorName };
    };
    const initialBores = [
        initializeBore(1, 'Sharma Farm Bore', '6.5 inch', 1000, '2025-10-20', 300000, 250000, 'Active', 'Vivek Sharma'),
        initializeBore(2, 'Municipal Project P-I', '10 inch', 500, '2024-11-15', 400000, 300000, 'Complete', 'Vivek Sharma'), 
        initializeBore(3, 'Residential Test Site', '4 inch', 350, '2025-12-01', 75000, 75000, 'Complete', 'Pooja Patel'), 
        initializeBore(4, 'V. Kumar Site', '8 inch', 800, '2026-01-10', 500000, 0, 'Planning', 'Amit Singh'),
    ];
    const [bores, setBores] = useState(initialBores);
  
    const initialExpenses = [
        { id: 101, date: '2025-11-20', category: 'Diesel', description: 'Fuel refill for Rig 1 (Sharma Farm)', amount: 15000, formattedAmount: formatNumberToCurrency(15000), auditorName: 'Vivek Sharma' },
        { id: 102, date: '2025-11-22', category: 'Tyres', description: 'Replacement of two back tyres', amount: 45000, formattedAmount: formatNumberToCurrency(45000), auditorName: 'Ajay Kumar' },
        { id: 103, date: '2025-11-23', category: 'Bits', description: 'New 6.5 inch drilling bit', amount: 10000, formattedAmount: formatNumberToCurrency(10000), auditorName: 'Ajay Kumar' },
    ];
    const [expenses, setExpenses] = useState(initialExpenses);

    const [users, setUsers] = useState(INITIAL_USERS);
  // --- End Centralized User/Data State ---


  const userRole = loggedInUser?.role;

  // Simple router
  if (currentPage === 'public') {
    return <PublicSite setCurrentPage={setCurrentPage} />;
  }
  
  if (currentPage === 'login') {
    return <AdminLogin setCurrentPage={setCurrentPage} setLoggedInUser={setLoggedInUser} users={users} />;
  }
  
  if (currentPage === 'dashboard' && (userRole === 'Super Admin' || userRole === 'Admin')) {
    return (
        <AdminDashboard 
            setCurrentPage={setCurrentPage} 
            setLoggedInUser={setLoggedInUser} 
            loggedInUser={loggedInUser} 
            users={users} 
            setUsers={setUsers} 
            bores={bores}
            setBores={setBores}
            expenses={expenses}
            setExpenses={setExpenses}
        />
    );
  }

  // Fallback (Should not be hit if login redirects correctly)
  return <PublicSite setCurrentPage={setCurrentPage} />;
}