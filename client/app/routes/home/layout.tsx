import Auth from '@/components/auth/status';
import Loading from '@/components/global/loading';
import { validateToken } from '@/query/auth';
import { authenticate } from '@/redux/slices/auth';
import type { RootState } from '@/redux/store';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Outlet, useNavigate } from 'react-router-dom';


export default function Layout() {
  return <Auth home={true} />;
}