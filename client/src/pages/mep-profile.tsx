import { useQuery } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Globe, Twitter, Facebook, MapPin, Calendar } from "lucide-react";
import { Link } from "wouter";

export default function MEPProfile() {
  const [, params] = useRoute("/meps/:id");
  const mepId = params?.id;

  const { data: mep, isLoading } = useQuery({
    queryKey: ['/api/meps', mepId],
    queryFn: () => api.getMEP(mepId!),
    enabled: !!mepId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="bg-white rounded-lg p-8">
              <div className="flex items-start space-x-6">
                <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-4">
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!mep) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <h1 className="text-xl font-bold text-gray-900 mb-4">MEP Not Found</h1>
              <p className="text-slate-gray mb-4">The requested MEP profile could not be found.</p>
              <Link href="/meps">
                <Button>Back to MEPs</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getPoliticalGroupColor = (group?: string) => {
    const colors: Record<string, string> = {
      'EPP': 'bg-blue-100 text-blue-800',
      'S&D': 'bg-red-100 text-red-800',
      'RE': 'bg-green-100 text-green-800',
      'ID': 'bg-yellow-100 text-yellow-800',
      'ECR': 'bg-purple-100 text-purple-800',
      'Greens/EFA': 'bg-emerald-100 text-emerald-800',
      'GUE/NGL': 'bg-pink-100 text-pink-800',
    };
    return colors[group || ''] || 'bg-gray-100 text-gray-800';
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/meps">
            <Button variant="ghost" className="mb-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to MEPs
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">MEP Profile</h1>
        </div>

        {/* Profile Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row items-start space-y-6 md:space-y-0 md:space-x-8">
              <Avatar className="w-24 h-24">
                <AvatarImage src={mep.photoUrl} alt={mep.fullName} />
                <AvatarFallback className="text-lg">
                  {getInitials(mep.firstName, mep.lastName)}
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-2">{mep.fullName}</h2>
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{mep.country}</Badge>
                  {mep.politicalGroupAbbr && (
                    <Badge className={getPoliticalGroupColor(mep.politicalGroupAbbr)}>
                      {mep.politicalGroupAbbr}
                    </Badge>
                  )}
                </div>

                {mep.politicalGroup && (
                  <p className="text-slate-gray mb-2">{mep.politicalGroup}</p>
                )}
                {mep.nationalPoliticalGroup && (
                  <p className="text-slate-gray mb-4">National Party: {mep.nationalPoliticalGroup}</p>
                )}

                {/* Contact Information */}
                <div className="flex flex-wrap gap-4">
                  {mep.email && (
                    <a
                      href={`mailto:${mep.email}`}
                      className="flex items-center text-primary hover:text-primary/80"
                    >
                      <Mail className="w-4 h-4 mr-1" />
                      Email
                    </a>
                  )}
                  {mep.website && (
                    <a
                      href={mep.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:text-primary/80"
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Website
                    </a>
                  )}
                  {mep.twitter && (
                    <a
                      href={mep.twitter}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:text-primary/80"
                    >
                      <Twitter className="w-4 h-4 mr-1" />
                      Twitter
                    </a>
                  )}
                  {mep.facebook && (
                    <a
                      href={mep.facebook}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-primary hover:text-primary/80"
                    >
                      <Facebook className="w-4 h-4 mr-1" />
                      Facebook
                    </a>
                  )}
                  {mep.officialUrl && (
                    <a
                      href={mep.officialUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
                    >
                      <Globe className="w-4 h-4 mr-1" />
                      Official EU Parliament Profile ↗
                    </a>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {mep.birthDate && (
                <div className="flex items-center space-x-3">
                  <Calendar className="w-5 h-5 text-slate-gray" />
                  <div>
                    <p className="font-medium">Date of Birth</p>
                    <p className="text-slate-gray">{mep.birthDate}</p>
                  </div>
                </div>
              )}
              {mep.birthPlace && (
                <div className="flex items-center space-x-3">
                  <MapPin className="w-5 h-5 text-slate-gray" />
                  <div>
                    <p className="font-medium">Place of Birth</p>
                    <p className="text-slate-gray">{mep.birthPlace}</p>
                  </div>
                </div>
              )}
              <Separator />
              <div>
                <p className="font-medium mb-2">MEP Since</p>
                <p className="text-slate-gray">{new Date(mep.createdAt).getFullYear()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Committee Memberships */}
          <Card>
            <CardHeader>
              <CardTitle>Committee Memberships</CardTitle>
            </CardHeader>
            <CardContent>
              {mep.committees.length === 0 ? (
                <p className="text-slate-gray">No committee memberships</p>
              ) : (
                <div className="space-y-4">
                  {mep.committees.map((membership) => (
                    <div key={membership.committee.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold">{membership.committee.name}</h4>
                        <Badge variant="secondary">{membership.committee.code}</Badge>
                      </div>
                      {membership.role && (
                        <p className="text-sm text-slate-gray">Role: {membership.role}</p>
                      )}
                      <Link href={`/committees/${membership.committee.id}`}>
                        <Button variant="outline" size="sm" className="mt-2">
                          View Committee
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
