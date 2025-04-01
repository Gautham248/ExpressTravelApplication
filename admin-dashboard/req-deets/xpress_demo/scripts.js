
const TRAVEL_REQUESTS_URL = 'https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests.json';
const EMPLOYEE_DETAILS_URL = 'https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/employees.json';
const MANAGERS_DETAILS_URL = 'https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/managers.json';
class TravelRequestManager {
    constructor() {
        this.initialize();
    }

    // async initialize() {
    //     await this.delay(100); // Ensures DOM is ready
    //     this.initializeEventListeners();
    // }
// Add this to the initialize method to make sure we can see it for debugging
async initialize() {
    await this.delay(100); // Ensures DOM is ready
    this.initializeEventListeners();
    
    // Temporary: Force show communication section to verify it exists
    const communicationElements = document.querySelectorAll('.request-communication');
    communicationElements.forEach(element => {
        console.log('Found communication section:', element);
        element.style.display = 'block'; // Force display for testing
    });
}
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    initializeEventListeners() {
        this.loadManagerInfo();

        if (document.getElementById('requests-tbody')) {
            this.loadRequests();
            this.setupFilterAndSearch();
        }

        if (document.getElementById('request-id-number')) {
            this.loadRequestDetails();
        }

        this.setupCommunicationSection();
    }

    async loadRequests() {
        try {
            const requests = (await axios.get(TRAVEL_REQUESTS_URL)).data;
            const requestsTableBody = document.getElementById('requests-tbody');
            requestsTableBody.innerHTML = '';

            if (!requests || Object.keys(requests).length === 0) {
                requestsTableBody.innerHTML = `<td colspan="7" class="text-center">No travel requests found</td>`;
                this.updateTotalRequestsCount(0);
                return;
            }

            this.updateTotalRequestsCount(Object.keys(requests).length);
            Object.entries(requests).forEach(([requestId, requestData]) => {
                requestsTableBody.appendChild(this.createRequestRow(requestId, requestData));
            });
        } catch (error) {
            this.handleError('Error loading requests:', error, 'Unable to load requests. Please try again later.');
        }
    }

    async loadManagerInfo() {
        try {
          const response = await axios.get(MANAGERS_DETAILS_URL);
          this.managers = response.data || {};
          
          const du1Manager = Object.values(this.managers).find(manager => 
            manager.deliveryUnit === 'DU1'
          );
          
          if (du1Manager) {
            const profileName = document.querySelector('.profile-name');
            const profileEmail = document.querySelector('.profile-email');
            
            if (profileName) profileName.textContent = du1Manager.name;
            if (profileEmail) profileEmail.textContent = du1Manager.email;
          }
        } catch (error) {
          console.error('Error loading manager info:', error);
        }
      }

    createRequestRow(requestId, requestData) {
        const row = document.createElement('tr');
        const travelTypeBadge = requestData.travelDetails.travelType === 'international' ?
            '<span class="badge badge-international">International</span>' :
            '<span class="badge badge-domestic">Domestic</span>';

        row.innerHTML = `
            <td>${requestId}</td>
            <td>${requestData.travelDetails.travelDate || 'N/A'}</td>
            <td>${requestData.travelDetails.sourceCity || 'N/A'}</td>
            <td>${requestData.travelDetails.destinationCity || 'N/A'}</td>
            <td>${requestData.travelDetails.projectCode || 'N/A'}</td>
            <td class="status-${(requestData.bookingDetails.status || '').toLowerCase()}">${requestData.bookingDetails.status || 'N/A'}</td>
            <td><button class="btn btn-view-details" data-request-id="${requestId}">View Details 👁️</button></td>
        `;

        row.querySelector('.btn-view-details').addEventListener('click', () => {
            window.location.href = `index.html?requestId=${requestId}`;
        });

        return row;
    }

    setupApproveRejectButtons(requestId, requestData) {
        const approveButton = document.querySelector('.btn-approve');
        const rejectButton = document.querySelector('.btn-reject');

        if (!approveButton || !rejectButton) return;

        const isPending = requestData.bookingDetails.status.toLowerCase() === 'pending';
        approveButton.disabled = rejectButton.disabled = !isPending;

        const handleStatusChange = async (newStatus, successMessage) => {
            approveButton.disabled = rejectButton.disabled = true;
            try {
                await this.updateRequestStatus(requestId, newStatus);
                this.updateUIStatus(newStatus);
                this.updateRequestProgress(newStatus);
                this.showSuccessMessage(successMessage);
            } catch (error) {
                this.handleError(`Error ${newStatus === 'approved' ? 'approving' : 'rejecting'} request:`, error, `Failed to ${newStatus === 'approved' ? 'approve' : 'reject'} request. Please try again.`);
                if (isPending) approveButton.disabled = rejectButton.disabled = false;
            }
        };

        approveButton.addEventListener('click', () => handleStatusChange('approved', 'Request approved successfully!'));
        rejectButton.addEventListener('click', () => handleStatusChange('rejected', 'Request rejected successfully!'));
    }

    // async updateRequestStatus(requestId, newStatus) {
    //     const REQUEST_URL_UPDATE = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/status.json`;
    //     const CLOSE_AT_URL = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/closeAt.json`;
    //     await axios.put(REQUEST_URL_UPDATE, JSON.stringify(newStatus));
    //     if (newStatus === 'rejected') {
    //       const now = new Date();
    //       const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
    //       await axios.put(CLOSE_AT_URL, JSON.stringify(formattedDate));
    //     }
    // }
    async updateRequestStatus(requestId, newStatus) {
        const REQUEST_URL_UPDATE = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/status.json`;
        const CLOSE_AT_URL = `https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/bookingDetails/closeAt.json`;
        await axios.put(REQUEST_URL_UPDATE, JSON.stringify(newStatus));
        
        // Add timestamp when request is rejected or closed
        if (newStatus === 'rejected' || newStatus === 'closed') {
            const now = new Date();
            const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            await axios.put(CLOSE_AT_URL, JSON.stringify(formattedDate));
        }
    }
    showSuccessMessage(message) {
      const successContainer = this.createMessageContainer('success-message', message);
      document.body.appendChild(successContainer);
        setTimeout(() => successContainer.classList.add('fade-out'), 3000);
        setTimeout(() => successContainer.remove(), 3500);
    }

    updateRequestProgress(status) {
        const progressSteps = document.querySelectorAll('.progress-step');
        const stepTexts = document.querySelectorAll('.step-details h6');

        progressSteps.forEach(step => step.classList.remove('completed', 'active', 'pending', 'reject'));
        progressSteps[0].classList.add('completed');

        if (status === 'rejected') {
            progressSteps[1].classList.add('reject');
            stepTexts[1].textContent = 'Manager Rejected';
            for (let i = 2; i < progressSteps.length; i++) progressSteps[i].classList.add('pending');
            return;
        }

        const statusProgression = ['pending', 'approved', 'ticketed', 'closed'];
        const currentStatusIndex = statusProgression.indexOf(status);
        if (currentStatusIndex === -1) return;

        stepTexts[1].textContent = currentStatusIndex >= 1 ? 'Manager Approved' : 'Waiting for Manager Approval';
        stepTexts[2].textContent = currentStatusIndex >= 2 ? 'Tickets Confirmed' : 'Waiting for Ticket Confirmation';
        stepTexts[3].textContent = currentStatusIndex >= 3 ? 'Request Closed' : 'Closing Request';

        for (let i = 0; i <= currentStatusIndex; i++) progressSteps[i].classList.add('completed');
        if (currentStatusIndex + 1 < progressSteps.length) progressSteps[currentStatusIndex + 1].classList.add('active');
    }

    async fetchEmployeeDetails(employeeId) {
        try {
            const employees = (await axios.get(EMPLOYEE_DETAILS_URL)).data;
            if (!employees) return null;
            const employeeKey = Object.keys(employees).find(key => key === employeeId);
            return employeeKey ? { empId: employeeKey, ...employees[employeeKey] } : null;
        } catch (error) {
            this.handleError('Error fetching employee details:', error);
            return null;
        }
    }

    async loadRequestDetails() {
        try {
            const requestId = new URLSearchParams(window.location.search).get('requestId');
            if (!requestId) return this.showErrorMessage('No request ID provided');

            const requests = (await axios.get(TRAVEL_REQUESTS_URL)).data;
            if (!requests) return this.showErrorMessage('No requests found');

            const matchedRequest = Object.entries(requests).find(([id]) => /^TR-\d+$/.test(id) && id === requestId);
            if (!matchedRequest) return this.showErrorMessage('Request not found');

            const [matchedRequestId, requestData] = matchedRequest;
            this.populateRequestDetails(matchedRequestId, requestData);
            this.setupApproveRejectButtons(matchedRequestId, requestData);
            this.updateSendButtonState(requestData.bookingDetails.status);
        } catch (error) {
            this.handleError('Error loading request details:', error, 'Unable to load request details. Please try again later.');
        }
    }

    updateSendButtonState(status) {
        const sendButton = document.querySelector('.btn-send');
        if (sendButton) sendButton.disabled = status.toLowerCase() !== 'approved';
    }

    async loadTicketOptions(requestId, requestData) {
        const container = document.getElementById('ticket-options-container');
        if (!container) return console.warn('Ticket options container not found');
        container.innerHTML = '';
        if (!requestData.ticketDetails?.optionTickets || Object.keys(requestData.ticketDetails.optionTickets).length === 0) {
            return container.innerHTML = '<p>No ticket options available yet.</p>';
        }

        let index = 0;
        for (const [ticketId, option] of Object.entries(requestData.ticketDetails.optionTickets)) {
            container.appendChild(this.createTicketOptionCard(ticketId, option, index++, requestData.ticketDetails.selectedTicket));
        }
    }

    createTicketOptionCard(ticketId, option, index, selectedTicket) {
        const card = document.createElement('div');
        card.className = 'ticket-option';
        let html = `<h3>Option ${index + 1}</h3><div class="ticket-option-details"><div class="ticket-option-detail"><label>Ticket ID:</label><span>${ticketId}</span></div>`;
        for (const [key, value] of Object.entries(option)) {
            if (value) html += `<div class="ticket-option-detail"><label>${this.formatLabel(key)}:</label><span>${key === 'price' ? '₹' + value.toLocaleString() : value}</span></div>`;
        }
        card.innerHTML = html + '</div>';

        if (selectedTicket && selectedTicket[ticketId]) {
            card.classList.add('selected');
            card.innerHTML += '<div class="selected-indicator">✓ Selected</div>';
        }
        return card;
    }

    formatLabel(camelCase) {
        const withSpaces = camelCase.replace(/([A-Z])/g, ' $1');
        return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
    }

    // setupCommunicationSection() {
    //     const sendButton = document.querySelector('.btn-send');
    //     const textarea = document.querySelector('.communication-input textarea');
    //     const container = document.getElementById('ticket-options-container');

    //     this.updateSendButtonState(document.getElementById('status').textContent);

    //     if (container) {
    //       container.addEventListener('click', e => {
    //           if (e.target.closest('.ticket-option-detail span')) {
    //               const ticketId = e.target.textContent.trim();
    //               if (textarea) {
    //                   textarea.value = ticketId;
    //                   textarea.focus();
    //               }
    //           } else {
    //               const option = e.target.closest('.ticket-option');
    //               if (option) {
    //                   const ticketId = option.querySelector('.ticket-option-detail span').textContent.trim();
    //                   if (textarea) {
    //                       textarea.value = ticketId;
    //                       textarea.focus();
    //                   }
    //               }
    //           }
    //       });
    //   }

    //   if (sendButton && textarea) {
    //     sendButton.addEventListener('click', () => {
    //         const message = textarea.value.trim();
    //         if (message) {
    //             // this.addMessageToCommunicationLog(message, 'outgoing');
    //             this.updateSelectedTicket(message);
    //             textarea.value = '';
    //         }
    //       });
    //   }
    // }
    // Modify the setupCommunicationSection method to check initial status
// Modify the setupCommunicationSection method to check initial status
setupCommunicationSection() {
    const sendButton = document.querySelector('.btn-send');
    const statusElement = document.getElementById('status');
    
    if (statusElement) {
        this.updateCommunicationVisibility(statusElement.textContent);
    }
    
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            const ticketId = this.collectTicketData(); // Create a new method to collect data
            if (ticketId) {
                this.updateSelectedTicket(ticketId);
            }
        });
    }
}

// Add a method to collect ticket data from the form
// collectTicketData() {
//     const airline = document.querySelector('.ticket-field input[value="Japan Airlines"]');
//     const departureTime = document.querySelector('.ticket-field input[type="datetime-local"]');
//     const flightNumber = document.querySelector('.ticket-field input[value="JL-602"]');
//     const price = document.querySelector('.ticket-field input[value="₹95,000"]');
    
//     if (!airline || !departureTime || !flightNumber || !price) {
//         this.showErrorMessage('Please fill in all ticket details');
//         return null;
//     }
    
//     // Generate a ticket ID
//     const ticketId = `TIC-${Math.floor(Math.random() * 1000000000)}`;
    
//     // Return the ticket ID for now - in a real app, we would create the ticket object
//     return ticketId;
// }

// Add a method to collect ticket data from the form
collectTicketData() {
    const airline = document.querySelector('.ticket-field input[value="Japan Airlines"]');
    const departureTime = document.querySelector('.ticket-field input[type="datetime-local"]');
    const flightNumber = document.querySelector('.ticket-field input[value="JL-602"]');
    const price = document.querySelector('.ticket-field input[value="₹95,000"]');
    
    if (!airline || !departureTime || !flightNumber || !price) {
        this.showErrorMessage('Please fill in all ticket details');
        return null;
    }
    
    // Generate a ticket ID
    const ticketId = `TIC-${Math.floor(Math.random() * 1000000000)}`;
    
    // Return the ticket ID for now - in a real app, we would create the ticket object
    return ticketId;
}

    addMessageToCommunicationLog(message, type) {
        const container = document.querySelector('.communication-log');
        if (!container) return;
        const msg = this.createMessageContainer(`communication-message ${type}`, message.replace(/\n/g, '<br>'));
        msg.innerHTML = `<div class="message-content">${message.replace(/\n/g, '<br>')}</div>`;
        container.appendChild(msg);
        container.scrollTop = container.scrollHeight;
    }

    async updateSelectedTicket(ticketId) {
      try {
          const requestId = new URLSearchParams(window.location.search).get('requestId');
          if (!requestId) return this.addMessageToCommunicationLog('Error: Unable to determine request ID.', 'system');
  
          const requestData = (await axios.get(`https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}.json`)).data;
          if (!requestData?.ticketDetails?.optionTickets) return this.addMessageToCommunicationLog('Error: Ticket information not available.', 'system');
          if (!requestData.ticketDetails.optionTickets[ticketId]) return this.addMessageToCommunicationLog('Error: Selected ticket not found in available options.', 'system');
  
          const selectedTicket = { [ticketId]: requestData.ticketDetails.optionTickets[ticketId] };
          await axios.put(`https://xpress-d7ec9-default-rtdb.asia-southeast1.firebasedatabase.app/travelRequests/${requestId}/ticketDetails/selectedTicket.json`, selectedTicket);
  
          this.addMessageToCommunicationLog(`Ticket ${ticketId} has been selected successfully.`, 'system');
  
          this.highlightSelectedTicket(ticketId);
  
          if (requestData.bookingDetails.status === 'approved') {
              await this.updateRequestStatus(requestId, 'ticketed');
              this.updateUIStatus('ticketed');
              this.updateRequestProgress('ticketed');
          }
          this.updateSendButtonState(document.getElementById('status').textContent);
  
      } catch (error) {
          this.handleError('Error updating selected ticket:', error, 'An error occurred while selecting the ticket. Please try again.');
      }
  }

    highlightSelectedTicket(ticketId) {
        document.querySelectorAll('.ticket-option').forEach(option => {
            const optionId = option.querySelector('.ticket-option-detail span').textContent.trim();
            option.classList.toggle('selected', optionId === ticketId);
            option.querySelector('.selected-indicator')?.remove();
            if (optionId === ticketId) option.innerHTML += '<div class="selected-indicator">✓ Selected</div>';
        });
    }

    // async populateRequestDetails(requestId, requestData) {
    //     const details = {
    //         'request-id-number': requestId,
    //         'project-code': requestData.travelDetails.projectCode,
    //         'travel-type': requestData.travelDetails.travelType,
    //         'source': requestData.travelDetails.sourceCity,
    //         'destination': requestData.travelDetails.destinationCity,
    //         'travel-date': requestData.travelDetails.travelDate,
    //         'status': requestData.bookingDetails.status
    //     };

    //     Object.entries(details).forEach(([id, value]) => {
    //         const element = document.getElementById(id);
    //         if (element) element.textContent = value || 'N/A';
    //     });

    //     this.updateUIStatus(requestData.bookingDetails.status);
    //     await this.displayEmployeeDetails(requestData.employeeId);
    //     this.updateRequestProgress(requestData.bookingDetails.status);
    //     this.loadTicketOptions(requestId, requestData);
    // }
    // async populateRequestDetails(requestId, requestData) {
    //     const details = {
    //         'request-id-number': requestId,
    //         'project-code': requestData.travelDetails.projectCode,
    //         'travel-type': requestData.travelDetails.travelType,
    //         'source': requestData.travelDetails.sourceCity,
    //         'destination': requestData.travelDetails.destinationCity,
    //         'travel-date': requestData.travelDetails.travelDate,
    //         'status': requestData.bookingDetails.status
    //     };
    
    //     Object.entries(details).forEach(([id, value]) => {
    //         const element = document.getElementById(id);
    //         if (element) element.textContent = value || 'N/A';
    //     });
    
    //     this.updateUIStatus(requestData.bookingDetails.status);
    //     await this.displayEmployeeDetails(requestData.employeeId);
    //     this.updateRequestProgress(requestData.bookingDetails.status);
    //     this.loadTicketOptions(requestId, requestData);
        
    //     // Show/hide request-communication section based on status
    //     const communicationSection = document.querySelector('.request-communication');
    //     if (communicationSection) {
    //         communicationSection.style.display = 
    //             requestData.bookingDetails.status.toLowerCase() === 'approved' ? 'block' : 'none';
    //     }
    // }


    async populateRequestDetails(requestId, requestData) {
        const details = {
            'request-id-number': requestId,
            'project-code': requestData.travelDetails.projectCode,
            'travel-type': requestData.travelDetails.travelType,
            'source': requestData.travelDetails.sourceCity,
            'destination': requestData.travelDetails.destinationCity,
            'travel-date': requestData.travelDetails.travelDate,
            'status': requestData.bookingDetails.status
        };
    
        Object.entries(details).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || 'N/A';
        });
    
        this.updateUIStatus(requestData.bookingDetails.status);
        await this.displayEmployeeDetails(requestData.employeeId);
        this.updateRequestProgress(requestData.bookingDetails.status);
        this.loadTicketOptions(requestId, requestData);
        
        // Show/hide request-communication section based on status
        this.updateCommunicationVisibility(requestData.bookingDetails.status);
    }
    
    updateUIStatus(status) {
        const element = document.getElementById('status');
        if (element) {
            element.className = `status-${status.toLowerCase()}`;
            element.textContent = status;
        }
        
        // Update communication visibility
        this.updateCommunicationVisibility(status);
    }
    
    // Add a new method to handle communication visibility
    // updateCommunicationVisibility(status) {
    //     // Log the status for debugging
    //     console.log('Current status:', status);
        
    //     // Get all elements with request-communication class
    //     const communicationElements = document.querySelectorAll('.request-communication');
        
    //     // Check if we found any elements
    //     console.log('Found communication elements:', communicationElements.length);
        
    //     // Set display based on status
    //     const isApproved = status.toLowerCase() === 'approved';
    //     console.log('Should show communication:', isApproved);
        
    //     communicationElements.forEach(element => {
    //         element.style.display = isApproved ? 'block' : 'none';
    //     });
    // }
    // Add this function to the TravelRequestManager class
updateCommunicationVisibility(status) {
    const communicationElements = document.querySelectorAll('.request-communication');
    const isApproved = status.toLowerCase() === 'approved';
    const isTicketed = status.toLowerCase() === 'ticketed';
    
    // Toggle visibility of the entire communication section
    communicationElements.forEach(element => {
        element.style.display = (isApproved || isTicketed) ? 'block' : 'none';
    });
    
    // Get ticket details form and send button
    const ticketDetailsForm = document.querySelector('.ticket-details-form');
    const sendButton = document.querySelector('.btn-send');
    const communicationInput = document.querySelector('.communication-input');
    
    // Create or update the close request button
    let closeButton = document.querySelector('.btn-close-request');
    if (!closeButton && communicationInput) {
        closeButton = document.createElement('button');
        closeButton.className = 'btn-close-request';
        closeButton.textContent = 'Close Request';
        closeButton.style.backgroundColor = '#17A948';
        closeButton.style.color = 'white';
        closeButton.style.border = 'none';
        closeButton.style.padding = '8px 15px';
        closeButton.style.borderRadius = '4px';
        closeButton.style.cursor = 'pointer';
        closeButton.style.marginTop = '10px';
        
        // Add event listener to handle request closing
        closeButton.addEventListener('click', async () => {
            const requestId = new URLSearchParams(window.location.search).get('requestId');
            if (requestId) {
                try {
                    await this.updateRequestStatus(requestId, 'closed');
                    this.updateUIStatus('closed');
                    this.updateRequestProgress('closed');
                    this.showSuccessMessage('Request closed successfully!');
                } catch (error) {
                    this.handleError('Error closing request:', error, 'Failed to close request. Please try again.');
                }
            }
        });
        
        communicationInput.appendChild(closeButton);
    }
    
    // Toggle visibility based on status
    if (ticketDetailsForm) {
        ticketDetailsForm.style.display = isApproved ? 'block' : 'none';
    }
    
    if (sendButton) {
        sendButton.style.display = isApproved ? 'inline-block' : 'none';
    }
    
    if (closeButton) {
        closeButton.style.display = isTicketed ? 'block' : 'none';
    }
    
    // Update the section title based on status
    const sectionTitle = document.querySelector('.communication-section h2');
    if (sectionTitle) {
        sectionTitle.textContent = isApproved ? 'Add Tickets' : (isTicketed ? 'Complete Request' : 'Tickets');
    }
}
    async displayEmployeeDetails(employeeId) {
        const employeeInfo = await this.fetchEmployeeDetails(employeeId);
        const container = document.getElementById('employee-info');
        if (!container) return;

        if (employeeInfo) {
            container.innerHTML = `<p><b>${employeeInfo.name}</b></p><p>ID: ${employeeInfo.empId}</p><p>Department: ${employeeInfo.deliveryUnit || 'N/A'}</p>`;
        } else {
            container.innerHTML = `<p>Employee details not found for ID: ${employeeId || 'N/A'}</p>`;
        }
    }

    setupFilterAndSearch() {} // Placeholder

    handleError(message, error, displayMessage) {
        console.error(message, error);
        if (displayMessage) this.showErrorMessage(displayMessage);
    }

    showErrorMessage(message) {
      const errorContainer = this.createMessageContainer('error-message', message);
      document.body.insertAdjacentElement('afterbegin', errorContainer);
    }

    createMessageContainer(className, text) {
    const container = document.createElement('div');
        container.className = className;
        container.textContent = text;
        return container;
    }

    // updateUIStatus(status) {
    //     const element = document.getElementById('status');
    //     if (element) {
    //         element.className = `status-${status.toLowerCase()}`;
    //         element.textContent = status;
    //     }
    // }
    updateUIStatus(status) {
        const element = document.getElementById('status');
        if (element) {
            element.className = `status-${status.toLowerCase()}`;
            element.textContent = status;
        }
        
        // Show/hide request-communication section based on status
        const communicationSection = document.querySelector('.request-communication');
        if (communicationSection) {
            communicationSection.style.display = 
                status.toLowerCase() === 'approved' ? 'block' : 'none';
        }
    }

    updateTotalRequestsCount(count) {
        const element = document.getElementById('total-requests');
        if (element) element.textContent = `Total ${count} requests`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (typeof axios === 'undefined') return console.error('Axios library is not loaded');
    new TravelRequestManager();
});