
(function () {
    emailjs.init({
        publicKey: "RXumA3BYxAlTfoZRO"
    });
})();

window.sendBookingConfirmation = async function (booking) {
    try {
        if (typeof emailjs === "undefined") {
            throw new Error("EmailJS library is not loaded.");
        }

        if (!booking || !booking.customerEmail) {
            throw new Error("Customer email address is missing.");
        }

        const response = await emailjs.send(
            "service_u0tfit1",
            "template_k2aw30i",
            {
                to_email: booking.customerEmail,
                user_name: booking.customerName || "Customer",
                event_name: booking.eventName || "Your Event",
                booking_id: booking.bookingId || "N/A",
                booking_status: booking.status || "Pending"
            }
        );

        console.log(
            "Booking confirmation email sent:",
            response.status
        );

        return true;
    } catch (error) {
        console.error(
            "Booking confirmation email failed:",
            error
        );

        return false;
    }
};


/*
 * Contact enquiry notification.
 * Create an EmailJS template addressed to rbsbevents@gmail.com,
 * then replace CONTACT_TEMPLATE_ID with the generated template ID.
 */
window.sendContactEnquiry = async function (enquiry) {
    const CONTACT_TEMPLATE_ID = "template_jlynijk";
    try {
        if (typeof emailjs === "undefined") throw new Error("EmailJS library is not loaded.");
        if (!enquiry || !enquiry.email || !enquiry.message) throw new Error("Required enquiry details are missing.");
        if (CONTACT_TEMPLATE_ID === "YOUR_CONTACT_TEMPLATE_ID") throw new Error("Contact EmailJS template ID has not been configured.");

        const response = await emailjs.send("service_u0tfit1", CONTACT_TEMPLATE_ID, {
            customer_name: enquiry.name || "Website visitor",
            customer_email: enquiry.email,
            customer_phone: enquiry.phone || "Not provided",
            subject: enquiry.subject || "Website enquiry",
            message: enquiry.message,
            submitted_at: new Date(enquiry.createdAt || Date.now()).toLocaleString()
        });
        console.log("Contact enquiry notification sent:", response.status);
        return response.status === 200;
    } catch (error) {
        console.error("Contact enquiry notification failed:", error);
        return false;
    }
};
