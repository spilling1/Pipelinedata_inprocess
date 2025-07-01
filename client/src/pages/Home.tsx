import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, TrendingUp, Users, LogOut, Target, Database, UserCheck, Settings, Activity, CheckCircle } from "lucide-react";
import { Link } from "wouter";
import { User } from "@shared/schema";

export default function Home() {
  const { user } = useAuth();
  const { canAccessPage, user: userWithPermissions, isAdmin, isLoading, isInactive } = usePermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show inactive user message
  if (isInactive) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Account Deactivated</CardTitle>
            <CardDescription>
              Your account has been deactivated. Please contact an administrator to regain access.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button variant="outline" onClick={() => window.location.href = '/api/auth/logout'}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Analytics Dashboard
            </h1>
            {userWithPermissions && (
              <Badge variant="secondary" className="ml-2">
                {userWithPermissions.roleInfo?.displayName || userWithPermissions.role}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            {user && (
              <div className="flex items-center gap-3">
                {user.profileImageUrl && (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Welcome, {user.firstName || user.email}
                </span>
              </div>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.href = '/api/logout'}
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">


        {/* Top Section - Analytics */}
        <div className="mb-8">
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Analytics
          </h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {canAccessPage('pipeline') && (
              <Link href="/dashboard">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <BarChart3 className="h-8 w-8 text-blue-600 mb-2" />
                    <CardTitle>Pipeline Analytics</CardTitle>
                    <CardDescription>
                      View comprehensive pipeline analytics and metrics
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {canAccessPage('marketing') && (
              <Link href="/marketing">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Target className="h-8 w-8 text-orange-600 mb-2" />
                    <CardTitle>Marketing Analytics</CardTitle>
                    <CardDescription>
                      Track campaign performance, ROI, and customer acquisition
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {canAccessPage('marketing_comparative') && (
              <Link href="/marketing-comparative">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Users className="h-8 w-8 text-purple-600 mb-2" />
                    <CardTitle>Marketing Comparative Analytics</CardTitle>
                    <CardDescription>
                      Team performance tracking and campaign influence analysis
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {canAccessPage('sales') && (
              <Link href="/sales">
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <TrendingUp className="h-8 w-8 text-green-600 mb-2" />
                    <CardTitle>Sales Analytics</CardTitle>
                    <CardDescription>
                      Analyze sales performance and revenue trends
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            )}

            {canAccessPage('people-ops') && (
              <a 
                href="https://lookerstudio.google.com/u/0/reporting/91488dc2-357c-4702-a465-1494756e8dac" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <UserCheck className="h-8 w-8 text-purple-600 mb-2" />
                    <CardTitle>People Ops Analytics</CardTitle>
                    <CardDescription>
                      Access comprehensive HR and people operations insights
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            )}

            {canAccessPage('customer-adoption') && (
              <a 
                href="https://ws.planhat.com/login/higharc" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <Activity className="h-8 w-8 text-teal-600 mb-2" />
                    <CardTitle>Customer Adoption Status</CardTitle>
                    <CardDescription>
                      Monitor customer adoption and engagement metrics
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            )}

            {canAccessPage('implementation-status') && (
              <a 
                href="https://lookerstudio.google.com/reporting/1950976e-8e22-4cc0-be97-7772ccef5f38" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                  <CardHeader>
                    <CheckCircle className="h-8 w-8 text-emerald-600 mb-2" />
                    <CardTitle>Implementation Status</CardTitle>
                    <CardDescription>
                      Track project implementation progress and milestones
                    </CardDescription>
                  </CardHeader>
                </Card>
              </a>
            )}
          </div>
        </div>

        {/* Bottom Section - Management */}
        {(canAccessPage('database') || canAccessPage('settings') || isAdmin) && (
          <div className="mb-8">
            <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
              Management
            </h3>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {canAccessPage('database') && (
                <Link href="/database">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Database className="h-8 w-8 text-purple-600 mb-2" />
                      <CardTitle>Database Management</CardTitle>
                      <CardDescription>
                        Manage your sales data and run custom queries
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )}

              {canAccessPage('settings') && (
                <Link href="/settings">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Settings className="h-8 w-8 text-green-600 mb-2" />
                      <CardTitle>Settings</CardTitle>
                      <CardDescription>
                        Configure stage mappings and probability settings
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )}

              {isAdmin && (
                <Link href="/user-management">
                  <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <Users className="h-8 w-8 text-blue-600 mb-2" />
                      <CardTitle>User Management</CardTitle>
                      <CardDescription>
                        Manage users, roles, and access permissions
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </Link>
              )}
            </div>
          </div>
        )}


      </main>
    </div>
  );
}