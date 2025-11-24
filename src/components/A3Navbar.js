'use client';

import React from "react";
import { Navbar, Nav } from 'rsuite';
import Link from 'next/link';
import './A3Navbar.css';

const A3Navbar = ({ onSelect, activeKey, logOut, ...props }) => {
  const [brandHover, setBrandHover] = React.useState(false);
  const [navItemHover, setNavItemHover] = React.useState(false);
  const [logoutHover, setLogoutHover] = React.useState(false);

  const baseItemStyle = (hover, active) => ({
    color: hover || active ? 'var(--main)' : 'white',
    background: hover || active ? 'var(--main-highlight)' : 'transparent',
  });

  return (
    <Navbar {...props} className="a3-navbar" style={{ height: '2em' }}>
      {/* left-side nav items */}
      <Nav as="div" className="a3-nav" style={{ alignItems: 'center' }}>
        <Nav.Item
          as={Link}
          href="/home"
          onMouseEnter={() => setBrandHover(true)}
          onMouseLeave={() => setBrandHover(false)}
          onSelect={onSelect('home')}
          active={activeKey === 'home'}
          className="a3-nav-item"
          style={baseItemStyle(brandHover, activeKey === 'home')}
        >
          Home
        </Nav.Item>

        <Nav.Item
          as={Link}
          href="/create"
          onMouseEnter={() => setNavItemHover(true)}
          onMouseLeave={() => setNavItemHover(false)}
          onSelect={onSelect('create')}
          active={activeKey === 'create'}
          className="a3-nav-item"
          style={baseItemStyle(navItemHover, activeKey === 'create')}
        >
          New A3
        </Nav.Item>
      </Nav>
      <Nav as="div" className="a3-nav" style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
        <Nav.Item
          onClick={logOut}
          className="a3-nav-item"
          onMouseEnter={() => setLogoutHover(true)}
          onMouseLeave={() => setLogoutHover(false)}
          style={{
            color: 'white',
            background: logoutHover ? 'var(--cancel)' : 'transparent',
            transition: 'all 150ms ease',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            padding: '6px 10px',
            textDecoration: 'none',
            borderRadius: '6px',
          }}>
          Log Out
        </Nav.Item>
      </Nav>
    </Navbar>
  );
};

export default A3Navbar;

