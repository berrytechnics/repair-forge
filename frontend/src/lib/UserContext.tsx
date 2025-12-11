// lib/UserContext.tsx
"use client";

import { usePathname } from "next/navigation";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";
import { getCurrentUser, User } from "./api";
import { getCurrentUserLocations, setCurrentLocation } from "./api/location.api";
import { hasAllPermissions, hasAnyPermission, hasPermission } from "./utils/permissions";

interface ExtendedUser extends User {
  currentLocationId?: string | null;
}

interface UserContextType {
  user: ExtendedUser | null;
  setUser: (user: ExtendedUser | null) => void;
  isLoading: boolean;
  availableLocations: Array<{ id: string; name: string }>;
  refreshUser: () => Promise<void>;
  switchLocation: (locationId: string) => Promise<void>;
  hasPermission: (permission: string) => boolean;
  hasAnyPermission: (permissions: string[]) => boolean;
  hasAllPermissions: (permissions: string[]) => boolean;
  // Superuser impersonation
  isSuperuser: boolean;
  impersonatedCompanyId: string | null;
  impersonateCompany: (companyId: string) => void;
  stopImpersonating: () => void;
}

const UserContext = createContext<UserContextType>({
  user: null,
  setUser: () => {},
  isLoading: true,
  availableLocations: [],
  refreshUser: async () => {},
  switchLocation: async () => {},
  hasPermission: () => false,
  hasAnyPermission: () => false,
  hasAllPermissions: () => false,
  isSuperuser: false,
  impersonatedCompanyId: null,
  impersonateCompany: () => {},
  stopImpersonating: () => {},
});

export const UserProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<ExtendedUser | null>(null);
  const [availableLocations, setAvailableLocations] = useState<
    Array<{ id: string; name: string }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [impersonatedCompanyId, setImpersonatedCompanyId] = useState<string | null>(null);
  const pathname = usePathname();

  // Load impersonation state from storage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("impersonateCompanyId") ||
                     sessionStorage.getItem("impersonateCompanyId");
      if (stored) {
        setImpersonatedCompanyId(stored);
      }
    }
  }, []);

  // Computed property for superuser check
  const isSuperuser = user?.role === "superuser";

  const fetchUser = async () => {
    try {
      const userData = await getCurrentUser();
      setUser(userData as ExtendedUser);

      // Fetch available locations for the user
      try {
        const locationsResponse = await getCurrentUserLocations();
        if (locationsResponse.data) {
          setAvailableLocations(locationsResponse.data);
        }
      } catch (err) {
        console.error("Error fetching locations:", err);
        // Don't fail user fetch if locations fail
      }
    } catch (err) {
      // If we get a 401/403, clear the token and user
      if (err && typeof err === "object" && "response" in err) {
        const axiosError = err as { response?: { status?: number } };
        if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
          // Clear invalid token from both storage types
          if (typeof window !== "undefined") {
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            sessionStorage.removeItem("accessToken");
            sessionStorage.removeItem("refreshToken");
            // Also clear impersonation state on auth errors
            localStorage.removeItem("impersonateCompanyId");
            sessionStorage.removeItem("impersonateCompanyId");
          }
        }
      }
      setUser(null);
      setAvailableLocations([]);
      // Clear impersonation state when user is cleared
      setImpersonatedCompanyId(null);
      throw err;
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  const switchLocation = async (locationId: string) => {
    try {
      await setCurrentLocation(locationId);
      await refreshUser();
    } catch (err) {
      console.error("Error switching location:", err);
      throw err;
    }
  };

  useEffect(() => {
    const loadUser = async () => {
      // Don't try to fetch user on login or register pages
      if (pathname === "/login" || pathname === "/register") {
        setIsLoading(false);
        setUser(null);
        return;
      }

      // Only try to fetch user if there's a token (check both localStorage and sessionStorage)
      const token = typeof window !== "undefined"
        ? (localStorage.getItem("accessToken") || sessionStorage.getItem("accessToken"))
        : null;
      if (!token) {
        setIsLoading(false);
        setUser(null);
        return;
      }

      // Always fetch user on mount/refresh to ensure we have the latest data
      // The check for existing user with permissions was preventing refresh from working
      try {
        setIsLoading(true);
        await fetchUser();
      } catch {
        // Error handling is done in fetchUser
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Superuser impersonation functions
  const impersonateCompany = (companyId: string) => {
    setImpersonatedCompanyId(companyId);
    if (typeof window !== "undefined") {
      // Store in localStorage (persists across sessions)
      localStorage.setItem("impersonateCompanyId", companyId);
      sessionStorage.setItem("impersonateCompanyId", companyId);
    }
    // Refresh user to get updated context
    refreshUser();
  };

  const stopImpersonating = () => {
    setImpersonatedCompanyId(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("impersonateCompanyId");
      sessionStorage.removeItem("impersonateCompanyId");
    }
    // Refresh user to get updated context
    refreshUser();
  };

  // Permission checking helpers
  // Superusers bypass all permission checks
  const hasPermissionCheck = (permission: string): boolean => {
    if (isSuperuser) return true;
    if (!user || !user.permissions) return false;
    return hasPermission(user.permissions, permission);
  };

  const hasAnyPermissionCheck = (permissionList: string[]): boolean => {
    if (isSuperuser) return true;
    if (!user || !user.permissions) return false;
    return hasAnyPermission(user.permissions, permissionList);
  };

  const hasAllPermissionsCheck = (permissionList: string[]): boolean => {
    if (isSuperuser) return true;
    if (!user || !user.permissions) return false;
    return hasAllPermissions(user.permissions, permissionList);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        availableLocations,
        refreshUser,
        switchLocation,
        hasPermission: hasPermissionCheck,
        hasAnyPermission: hasAnyPermissionCheck,
        hasAllPermissions: hasAllPermissionsCheck,
        isSuperuser,
        impersonatedCompanyId,
        impersonateCompany,
        stopImpersonating,
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);
