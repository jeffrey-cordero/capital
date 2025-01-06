import Auth from '@/components/auth/status';
import React from 'react';
import { Outlet } from 'react-router-dom';

export default function Layout() {
  return (
   <Auth home={false} />
  );
}