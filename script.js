
/* =========================================
   LIBSPACE - BASIC APPLICATION FUNCTIONALITY
   JavaScript
========================================= */

document.addEventListener("DOMContentLoaded", () => {

    // -------------------------------------
    // 1. DOM ELEMENTS
    // -------------------------------------

    const seatMap = document.getElementById("seat-map-grid");
    const floorSelect = document.getElementById("floor-select");

    const selectedSeatDisplay = document.getElementById("selected-seat");
    const bookingForm = document.getElementById("booking-form-element");

    const bookingDate = document.getElementById("booking-date");
    const startTime = document.getElementById("start-time");
    const endTime = document.getElementById("end-time");

    const bookingTable = document.getElementById("booking-table-body");
    const historyList = document.getElementById("booking-history-list");


    // -------------------------------------
    // 2. APPLICATION DATA
    // -------------------------------------

    const floors = {
        ground: { prefix: "G", count: 40 },
        first: { prefix: "F", count: 30 },
        second: { prefix: "S", count: 30 }
    };

    const resources = [
        "computer",
        "reading-room",
        "discussion-room"
    ];

    let selectedSeat = null;
    let selectedFloor = floorSelect.value;

    const STORAGE_KEY = "libspace_bookings";


    // -------------------------------------
    // 3. LOCAL STORAGE
    // -------------------------------------

    function getBookings() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch (error) {
            console.error("Unable to load bookings:", error);
            return [];
        }
    }

    function saveBookings(bookings) {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify(bookings)
        );
    }


    // -------------------------------------
    // 4. DATE AND TIME UTILITIES
    // -------------------------------------

    function getDateTime(date, time) {
        return new Date(`${date}T${time}:00`);
    }

    function isValidTime(date, start, end) {

        const now = new Date();

        const startDate = getDateTime(date, start);
        const endDate = getDateTime(date, end);

        return (
            !isNaN(startDate.getTime()) &&
            !isNaN(endDate.getTime()) &&
            startDate > now &&
            endDate > startDate
        );
    }

    function isOverlapping(start1, end1, start2, end2) {

        return start1 < end2 && end1 > start2;
    }

    function generateBookingId() {
        return "LIB" + Date.now().toString().slice(-8);
    }

    function formatDate(date) {
        return new Date(date + "T00:00:00")
            .toLocaleDateString("en-IN");
    }


    // -------------------------------------
    // 5. AUTOMATIC SEAT RELEASE
    // -------------------------------------

    function releaseExpiredBookings() {

        const bookings = getBookings();
        const now = new Date();

        let changed = false;

        bookings.forEach(booking => {

            if (
                booking.status === "confirmed" &&
                getDateTime(
                    booking.date,
                    booking.endTime
                ) <= now
            ) {
                booking.status = "expired";
                changed = true;
            }

        });

        if (changed) {
            saveBookings(bookings);
        }
    }


    // -------------------------------------
    // 6. CHECK SEAT AVAILABILITY
    // -------------------------------------

    function isSeatOccupied(seatId, date, start, end) {

        const bookings = getBookings();

        const requestedStart = getDateTime(date, start);
        const requestedEnd = getDateTime(date, end);

        return bookings.some(booking => {

            if (
                booking.type !== "seat" ||
                booking.seatId !== seatId ||
                booking.date !== date ||
                booking.status !== "confirmed"
            ) {
                return false;
            }

            const existingStart = getDateTime(
                booking.date,
                booking.startTime
            );

            const existingEnd = getDateTime(
                booking.date,
                booking.endTime
            );

            return isOverlapping(
                requestedStart,
                requestedEnd,
                existingStart,
                existingEnd
            );

        });
    }


    // -------------------------------------
    // 7. GENERATE VISUAL SEAT MAP
    // -------------------------------------

    function generateSeats() {

        selectedSeat = null;
        selectedSeatDisplay.textContent = "None selected";

        seatMap.innerHTML = "";

        const floor = floors[selectedFloor];

        const now = new Date();

        const today = now.toISOString()
            .slice(0, 10);

        const currentTime = now.getHours()
            .toString().padStart(2, "0") + ":" +
            now.getMinutes().toString().padStart(2, "0");

        for (let i = 1; i <= floor.count; i++) {

            const seatId =
                floor.prefix + "-" +
                i.toString().padStart(2, "0");

            const seat = document.createElement("button");

            seat.type = "button";
            seat.className = "seat available";
            seat.textContent = i;

            seat.setAttribute(
                "aria-label",
                "Seat " + seatId
            );

            const occupied = isSeatOccupied(
                seatId,
                today,
                currentTime,
                "23:59"
            );

            if (occupied) {

                seat.className = "seat occupied";
                seat.disabled = true;

            } else {

                seat.addEventListener("click", () => {

                    document.querySelectorAll(".seat.selected")
                        .forEach(item => {
                            item.classList.remove("selected");
                        });

                    selectedSeat = seatId;

                    seat.classList.add("selected");

                    selectedSeatDisplay.textContent = seatId;

                });

            }

            seatMap.appendChild(seat);

        }

        updateDashboard();
    }


    // -------------------------------------
    // 8. FLOOR SELECTION
    // -------------------------------------

    floorSelect.addEventListener("change", () => {

        selectedFloor = floorSelect.value;

        generateSeats();

    });


    // -------------------------------------
    // 9. BOOK A SEAT
    // -------------------------------------

    bookingForm.addEventListener("submit", event => {

        event.preventDefault();

        if (!selectedSeat) {
            alert("Please select an available seat first.");
            return;
        }

        const date = bookingDate.value;
        const start = startTime.value;
        const end = endTime.value;

        if (!date || !start || !end) {
            alert("Please fill in all booking details.");
            return;
        }

        if (!isValidTime(date, start, end)) {
            alert("Please select a valid future date and time slot.");
            return;
        }

        if (isSeatOccupied(selectedSeat, date, start, end)) {

            alert("This seat is already booked for the selected time.");

            generateSeats();
            return;
        }

        const bookings = getBookings();

        const newBooking = {

            id: generateBookingId(),

            type: "seat",

            seatId: selectedSeat,

            resource: selectedSeat,

            date: date,

            startTime: start,

            endTime: end,

            purpose: document.getElementById(
                "booking-purpose"
            ).value,

            status: "confirmed"

        };

        bookings.push(newBooking);

        saveBookings(bookings);

        alert("Seat booked successfully!");

        bookingForm.reset();

        selectedSeat = null;

        selectedSeatDisplay.textContent = "None selected";

        generateSeats();

        updateBookingTable();

        updateHistory();

        updateDashboard();

    });


    // -------------------------------------
    // 10. RESOURCE AVAILABILITY
    // -------------------------------------

    function isResourceOccupied(resource, date, start, end) {

        const bookings = getBookings();

        const requestedStart = getDateTime(date, start);
        const requestedEnd = getDateTime(date, end);

        return bookings.some(booking => {

            if (
                booking.type !== "resource" ||
                booking.resource !== resource ||
                booking.date !== date ||
                booking.status !== "confirmed"
            ) {
                return false;
            }

            return isOverlapping(
                requestedStart,
                requestedEnd,
                getDateTime(booking.date, booking.startTime),
                getDateTime(booking.date, booking.endTime)
            );

        });
    }


    // -------------------------------------
    // 11. BOOK LIBRARY RESOURCES
    // -------------------------------------

    document.querySelectorAll("[data-resource]")
        .forEach(button => {

            button.addEventListener("click", () => {

                const resource = button.dataset.resource;

                const date = prompt("Enter booking date (YYYY-MM-DD):");

                if (!date) return;

                const start = prompt("Enter start time (HH:MM):");

                if (!start) return;

                const end = prompt("Enter end time (HH:MM):");

                if (!end) return;

                if (!isValidTime(date, start, end)) {
                    alert("Invalid booking date or time.");
                    return;
                }

                if (
                    isResourceOccupied(
                        resource,
                        date,
                        start,
                        end
                    )
                ) {
                    alert("This resource is already booked.");
                    return;
                }

                const bookings = getBookings();

                bookings.push({

                    id: generateBookingId(),

                    type: "resource",

                    resource: resource,

                    seatId: null,

                    date: date,

                    startTime: start,

                    endTime: end,

                    status: "confirmed"

                });

                saveBookings(bookings);

                alert("Resource booked successfully!");

                updateBookingTable();
                updateHistory();
                updateDashboard();

            });

        });


    // -------------------------------------
    // 12. CANCEL BOOKING
    // -------------------------------------

    function cancelBooking(bookingId) {

        const confirmation = confirm(
            "Are you sure you want to cancel this booking?"
        );

        if (!confirmation) return;

        const bookings = getBookings();

        const booking = bookings.find(
            item => item.id === bookingId
        );

        if (!booking || booking.status !== "confirmed") {
            alert("Booking cannot be cancelled.");
            return;
        }

        booking.status = "cancelled";

        saveBookings(bookings);

        alert("Booking cancelled successfully.");

        generateSeats();

        updateBookingTable();

        updateHistory();

        updateDashboard();
    }


    // -------------------------------------
    // 13. DISPLAY BOOKING TABLE
    // -------------------------------------

    function updateBookingTable() {

        releaseExpiredBookings();

        const bookings = getBookings();

        const upcomingBookings = bookings.filter(booking => {

            return (
                booking.status === "confirmed" &&
                getDateTime(
                    booking.date,
                    booking.endTime
                ) > new Date()
            );

        });

        bookingTable.innerHTML = "";

        if (upcomingBookings.length === 0) {

            bookingTable.innerHTML = `
                <tr>
                    <td colspan="6">
                        No active bookings found.
                    </td>
                </tr>
            `;

            return;
        }

        upcomingBookings.forEach(booking => {

            const row = document.createElement("tr");

            const resourceName = booking.type === "seat"
                ? booking.seatId
                : booking.resource.replaceAll("-", " ");

            row.innerHTML = `
                <td>${booking.id}</td>

                <td>${resourceName}</td>

                <td>${formatDate(booking.date)}</td>

                <td>${booking.startTime} - ${booking.endTime}</td>

                <td>
                    <span class="status confirmed">
                        Confirmed
                    </span>
                </td>

                <td>
                    <button
                        class="secondary-btn cancel-booking"
                        data-id="${booking.id}">
                        Cancel
                    </button>
                </td>
            `;

            bookingTable.appendChild(row);

        });

        document.querySelectorAll(".cancel-booking")
            .forEach(button => {

                button.addEventListener("click", () => {

                    cancelBooking(button.dataset.id);

                });

            });

    }


    // -------------------------------------
    // 14. BOOKING HISTORY
    // -------------------------------------

    function updateHistory() {

        releaseExpiredBookings();

        const bookings = getBookings();

        historyList.innerHTML = "";

        if (bookings.length === 0) {

            historyList.textContent = "No previous bookings found.";

            return;
        }

        bookings.slice().reverse().forEach(booking => {

            const item = document.createElement("div");

            item.className = "history-item";

            const name = booking.type === "seat"
                ? booking.seatId
                : booking.resource.replaceAll("-", " ");

            const statusClass =
                booking.status === "confirmed"
                    ? "confirmed"
                    : booking.status === "cancelled"
                        ? "cancelled"
                        : "pending";

            item.innerHTML = `
                <div>
                    <h3>${name}</h3>
                    <p>
                        ${formatDate(booking.date)}
                        | ${booking.startTime} - ${booking.endTime}
                    </p>
                    <p>Booking ID: ${booking.id}</p>
                </div>

                <span class="status ${statusClass}">
                    ${booking.status}
                </span>
            `;

            historyList.appendChild(item);

        });

    }


    // -------------------------------------
    // 15. DASHBOARD STATISTICS
    // -------------------------------------

    function updateDashboard() {

        releaseExpiredBookings();

        const bookings = getBookings();

        const totalSeats = floors[selectedFloor].count;

        const now = new Date();

        const today = now.toISOString().slice(0, 10);

        const currentTime = now.getHours()
            .toString().padStart(2, "0") + ":" +
            now.getMinutes().toString().padStart(2, "0");

        let occupiedSeats = 0;

        for (let i = 1; i <= totalSeats; i++) {

            const seatId =
                floors[selectedFloor].prefix + "-" +
                i.toString().padStart(2, "0");

            if (
                isSeatOccupied(
                    seatId,
                    today,
                    currentTime,
                    "23:59"
                )
            ) {
                occupiedSeats++;
            }

        }

        const activeBookings = bookings.filter(booking => {

            return (
                booking.status === "confirmed" &&
                getDateTime(
                    booking.date,
                    booking.endTime
                ) > now
            );

        }).length;

        const bookedResources = new Set(
            bookings.filter(booking => {

                return (
                    booking.type === "resource" &&
                    booking.status === "confirmed" &&
                    getDateTime(
                        booking.date,
                        booking.endTime
                    ) > now
                );

            }).map(booking => booking.resource)
        );

        document.getElementById("available-seats")
            .textContent = totalSeats - occupiedSeats;

        document.getElementById("total-seats")
            .textContent = totalSeats;

        document.getElementById("active-bookings")
            .textContent = activeBookings;

        document.getElementById("available-resources")
            .textContent = resources.length - bookedResources.size;

    }


    // -------------------------------------
    // 16. NOTIFICATIONS
    // -------------------------------------

    document.querySelector(".notification-btn")
        .addEventListener("click", () => {

            alert("You have no new notifications.");

        });


    // -------------------------------------
    // 17. LOGOUT
    // -------------------------------------

    document.querySelector(".logout-btn")
        .addEventListener("click", () => {

            alert("Logout functionality will be connected to the login system.");

        });


    // -------------------------------------
    // 18. INITIALIZE APPLICATION
    // -------------------------------------

    const today = new Date();

    const localDate = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0")
    ].join("-");

    bookingDate.min = localDate;
    bookingDate.value = localDate;

    releaseExpiredBookings();

    generateSeats();

    updateBookingTable();

    updateHistory();

    updateDashboard();


    // Check expired bookings every minute.

    setInterval(() => {

        releaseExpiredBookings();

        generateSeats();

        updateBookingTable();

        updateHistory();

        updateDashboard();

    }, 60000);

});
