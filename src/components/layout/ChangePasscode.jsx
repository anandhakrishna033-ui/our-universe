import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db, auth } from "./firebase"; // Make sure your path is correct

// Pass the current passcode down to this component as a prop from your main state/context
const ChangePasscode = ({ currentPasscode }) => {
  const [oldPasscode, setOldPasscode] = useState("");
  const [newPasscode, setNewPasscode] = useState("");
  const [confirmPasscode, setConfirmPasscode] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdatePasscode = async (e) => {
    e.preventDefault();
    setStatusMessage("");
    setIsError(false);

    // 1. Verify the current passcode is correct
    if (oldPasscode !== currentPasscode) {
      setStatusMessage("Current passcode is incorrect.");
      setIsError(true);
      return;
    }

    // 2. Ensure the new passcodes match
    if (newPasscode !== confirmPasscode) {
      setStatusMessage("New passcodes do not match.");
      setIsError(true);
      return;
    }

    // 3. Prevent empty passcodes
    if (newPasscode.trim() === "") {
      setStatusMessage("Passcode cannot be empty.");
      setIsError(true);
      return;
    }

    setIsLoading(true);

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("No user logged in");

      // 4. Update the passcode in Firestore
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        appLockPasscode: newPasscode
      });

      // 5. Success reset
      setStatusMessage("Passcode successfully updated!");
      setIsError(false);
      setOldPasscode("");
      setNewPasscode("");
      setConfirmPasscode("");

    } catch (error) {
      console.error("Error updating passcode:", error);
      setStatusMessage("Failed to update passcode. Try again.");
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md w-full bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
      <h3 className="text-xl font-bold text-[#8B1235] mb-4">Change App Lock</h3>
      
      <form onSubmit={handleUpdatePasscode} className="flex flex-col gap-4">
        
        {/* Current Passcode */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Current Passcode</label>
          <input 
            type="password" 
            value={oldPasscode}
            onChange={(e) => setOldPasscode(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-[#8B1235]"
            placeholder="Enter current passcode"
            required
          />
        </div>

        {/* New Passcode */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">New Passcode</label>
          <input 
            type="password" 
            value={newPasscode}
            onChange={(e) => setNewPasscode(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-[#8B1235]"
            placeholder="Enter new passcode"
            required
          />
        </div>

        {/* Confirm New Passcode */}
        <div className="flex flex-col">
          <label className="text-sm text-gray-600 mb-1">Confirm New Passcode</label>
          <input 
            type="password" 
            value={confirmPasscode}
            onChange={(e) => setConfirmPasscode(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:outline-none focus:border-[#8B1235]"
            placeholder="Confirm new passcode"
            required
          />
        </div>

        {/* Status Message Display */}
        {statusMessage && (
          <p className={`text-sm ${isError ? "text-red-500" : "text-green-600"}`}>
            {statusMessage}
          </p>
        )}

        {/* Submit Button */}
        <button 
          type="submit"
          disabled={isLoading}
          className="mt-2 px-6 py-2 bg-[#8B1235] text-[#FCF8F9] rounded-lg font-semibold disabled:opacity-50"
        >
          {isLoading ? "Updating..." : "Update Passcode"}
        </button>
      </form>
    </div>
  );
};

export default ChangePasscode;