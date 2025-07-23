"use client";

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProfileForm } from '@/component/ProfileForm'; // Adjust path if needed

export default function ProfilePage() {
    return (
        <div className="h-full p-4 sm:p-8">
            <div className="max-w-2xl mx-auto">
                <Link href="/chat" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6">
                    <ArrowLeft size={16} />
                    Back to Chats
                </Link>
                <ProfileForm />
            </div>
        </div>
    );
}