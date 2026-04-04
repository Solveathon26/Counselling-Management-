import emailjs from '@emailjs/browser';

const SERVICE_ID = process.env.REACT_APP_EMAILJS_SERVICE_ID || 'your_service_id';
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID || 'your_template_id';
const PUBLIC_KEY = process.env.REACT_APP_EMAILJS_PUBLIC_KEY || 'your_public_key';

/**
 * Send an email alert via EmailJS
 * @param {Object} templateParams - Parameters for the EmailJS template
 * @returns {Promise} 
 */
export const sendEmailAlert = async (templateParams) => {
  if (!SERVICE_ID || SERVICE_ID === 'your_service_id') {
    console.warn('EmailJS Service ID not configured. Skipping email.');
    return;
  }

  try {
    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: process.env.REACT_APP_WARDEN_EMAIL || 'warden@university.edu',
        ...templateParams
      },
      PUBLIC_KEY
    );
    console.log('Email sent successfully!', response.status, response.text);
    return response;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};

/**
 * Specialized alert for SOS
 */
export const sendSosAlert = (regno, counsellorName = 'Emergency Duty') => {
  return sendEmailAlert({
    alert_type: 'URGENT SOS',
    student_regno: regno,
    message: `Student ${regno} has triggered an SOS alert. Please contact them immediately.`,
    counsellor: counsellorName,
    to_email: `${process.env.REACT_APP_WARDEN_EMAIL}, ${process.env.REACT_APP_COUNSELLOR_EMAIL}`
  });
};

/**
 * Specialized alert for high risk prediction
 */
export const sendHighRiskAlert = (regno, score) => {
  return sendEmailAlert({
    alert_type: 'AI HIGH RISK WARNING',
    student_regno: regno,
    message: `AI Model has detected a HIGH RISK level (Score: ${score}) for student ${regno}. Professional intervention is recommended.`,
    to_email: `${process.env.REACT_APP_WARDEN_EMAIL}, ${process.env.REACT_APP_COUNSELLOR_EMAIL}`
  });
};

/**
 * Specialized alert for parent concerns
 */
export const sendParentAlert = (regno, parentMsg) => {
  return sendEmailAlert({
    alert_type: 'PARENT CONCERN ALERT',
    student_regno: regno,
    message: `A parent has reported concerns regarding student ${regno}: "${parentMsg}"`,
    to_email: process.env.REACT_APP_WARDEN_EMAIL
  });
};
