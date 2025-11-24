"use client";
import React, { useState, useEffect } from 'react';
import SubmitButton from '@/components/SubmitButton';
import { useUser } from '@/state/UserContext';
import { useEmployees } from '@/state/EmployeesContext';
import InputText from '@/components/InputText';
import { useRouter } from 'next/navigation';
import './page.css';

export default function Page() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [errorFirst, setErrorFirst] = useState(false);
  const [errorLast, setErrorLast] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { user, setUser } = useUser();
  const { employees, setEmployees } = useEmployees();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push('/home');
    }
  }, [user, router]);

  const fullName = `${firstName.trim().toLowerCase()} ${lastName.trim().toLowerCase()}`;
  const firstNameCapitalized = `${firstName.trim().charAt(0).toUpperCase() + firstName.trim().slice(1).toLowerCase()}`;
  const lastNameCapitalized = `${lastName.trim().charAt(0).toUpperCase() + lastName.trim().slice(1).toLowerCase()}`;

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "firstName") {
      setErrorFirst(value.trim() === "");
      setFirstName(value);
    }
    if (name === "lastName") {
      setErrorLast(value.trim() === "");
      setLastName(value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    let valid = true;
    if (!firstName.trim()) {
      setErrorFirst(true);
      valid = false;
    }
    if (!lastName.trim()) {
      setErrorLast(true);
      valid = false;
    }
    if (!valid) return;

    const exists = employees.some(
      emp => emp === fullName
    );

    if (exists) {
      setUser(fullName);
      router.push('/home');
    } else {
      setShowModal(true);
    }
  };

  const handleConfirmAdd = async () => {
    const newEmployee = fullName;
    setEmployees([...employees, newEmployee]);
    setUser(fullName);

    // Add to JSON file via API
    await fetch('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee)
    });

    setShowModal(false);
    router.push('/home');
  };

  const handleCancelAdd = () => {
    setShowModal(false);
  };

  return (
    <main style={{ height: '100vh', width: '100vw', margin: 0, padding: 0, position: 'relative', overflow: 'hidden' }}>
      <div className="background"/>
      <form
        onSubmit={handleSubmit}
        style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'row', gap: '1em', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <InputText
            id="first-name"
            onChange={handleChange}
            width='200px'
            height='2em'
            placeholder='First Name'
            value={firstName}
            borderColor={errorFirst ? 'var(--cancel)' : 'var(--main)'}
            name="firstName"
            hoverColor='var(--accent-highlight)'
          />
          {errorFirst && (
            <span style={{ color: 'var(--cancel)', fontSize: '0.85em', marginTop: '0.25em' }}>
              First name is required
            </span>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <InputText
            id="last-name"
            width='200px'
            height='2em'
            placeholder='Last Name'
            value={lastName}
            onChange={handleChange}
            borderColor={errorLast ? 'var(--cancel)' : 'var(--main)'}
            name="lastName"
            hoverColor='var(--accent-highlight)'
          />
          {errorLast && (
            <span style={{ color: 'var(--cancel)', fontSize: '0.85em', marginTop: '0.25em' }}>
              Last name is required
            </span>
          )}
        </div>
        <SubmitButton
          width='100px'
          height='2em'
          bgColor='var(--main)'
          hoverColor='var(--main-highlight)'
          textColor='white'
        >Go</SubmitButton>
      </form>
      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
          background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10
        }}>
          <div style={{
            background: 'white', padding: '2em', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center'
          }}>
            <p>
              Employee not found.<br/>
              Do you want to add <b>{firstNameCapitalized} {lastNameCapitalized}</b> as a new employee?
            </p>
            <div style={{ display: 'flex', gap: '1em', marginTop: '1em' }}>
              <button onClick={handleConfirmAdd} style={{ padding: '0.5em 1em', background: 'var(--main)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', ':hover': { background: 'var(--accent-highlight)' } }}>Confirm</button>
              <button onClick={handleCancelAdd} style={{ padding: '0.5em 1em', background: '#eee', color: '#333', border: 'none', borderRadius: '4px', cursor: 'pointer', ':hover': { background: 'var(--cancel-highlight)' } }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}