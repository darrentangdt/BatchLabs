import * as moment from "moment";
import { Observable } from "rxjs";

import { AADUser } from "app/models";
import { AccessToken, AdalService } from "app/services/adal";
import { Constants } from "app/utils";
import { MockElectronRemote, mockStorage } from "test/utils/mocks";

const tenant1 = "tenant1";
const resource1 = "http://example.com";

const sampleUser: AADUser = {
    aud: "94ef904d-c21a-4972-9244-b4d6a12b8e13",
    iss: "https://sts.windows.net/72f788bf-86f1-41af-21ab-2d7cd011db47/",
    iat: 1483372574,
    nbf: 1483372574,
    exp: 1483376474,
    amr: ["pwd", "mfa"],
    family_name: "Smith",
    given_name: "Frank",
    ipaddr: "198.217.117.26",
    name: "Frank Smith",
    nonce: "be4e7843-305e-42ab-988d-7ee109989d70",
    oid: "8a0of62c-3629-4619-abd4-8c2257a282be",
    platf: "5",
    sub: "0WzjD2jhHJVb-3h2PbwUDCJOIPPIJmQQYE832uFqiII",
    tid: "72f988bf-86f1-41af-91ab-2d7cd011db47",
    unique_name: "frank.smith@example.com",
    upn: "frank.smith@example.com",
    ver: "1.0",
};

describe("AdalService", () => {
    let service: AdalService;
    let http: any = {};
    let currentUser: AADUser;
    const config = { tenant: "common", clientId: "abc", redirectUri: "http://localhost" };
    let zoneSpy;
    let remoteSpy: MockElectronRemote;

    beforeEach(() => {
        zoneSpy = {
            run: jasmine.createSpy("Zone.run").and.callFake((callback) => callback()),
        };
        remoteSpy =  new MockElectronRemote();
        mockStorage(localStorage);
        service = new AdalService(http, zoneSpy, remoteSpy);
        service.currentUser.subscribe(x => currentUser = x);
        service.init(config);
    });

    it("when there is no item in the localstorage it should not set the id_token", () => {
        localStorage.removeItem(Constants.localStorageKey.currentUser);
        const tmpService = new AdalService(http, zoneSpy, remoteSpy);
        tmpService.init(config);
        let user: AADUser = null;
        tmpService.currentUser.subscribe(x => user = x);
        expect(user).toBeNull();
    });

    it("when localstorage has currentUser it should load it", () => {
        localStorage.setItem(Constants.localStorageKey.currentUser, JSON.stringify(sampleUser));
        const tmpService = new AdalService(http, zoneSpy, remoteSpy);
        tmpService.init(config);
        let user: AADUser = null;
        tmpService.currentUser.subscribe(x => user = x);
        expect(user).not.toBeNull();
        expect(user.upn).toEqual("frank.smith@example.com");
    });

    describe("accessTokenData", () => {
        let authorizeSpy: jasmine.Spy;
        let refreshSpy: jasmine.Spy;
        let redeemSpy: jasmine.Spy;
        let decodeSpy: jasmine.Spy;
        let refreshedToken;
        let newToken;
        let token: AccessToken;

        beforeEach(() => {
            refreshedToken = new AccessToken({
                access_token: "refreshedToken", expires_on: moment().add(1, "hour").toDate(),
            } as any);
            newToken = new AccessToken({ access_token: "newToken", expires_on: moment().add(1, "hour") } as any);
            let authorizeResult = {
                id_token: "someidtoken",
                code: "somecode",
            };

            refreshSpy = jasmine.createSpy("refreshSpy").and.returnValue(Observable.of(refreshedToken));
            redeemSpy = jasmine.createSpy("redeemSpy").and.returnValue(Observable.of(newToken));
            authorizeSpy = jasmine.createSpy("authorizeSpy").and.returnValue(Observable.of(authorizeResult));
            decodeSpy = jasmine.createSpy("decodeSpy").and.returnValue(sampleUser);

            (service as any)._accessTokenService.refresh = refreshSpy;
            (service as any)._accessTokenService.redeem = redeemSpy;
            (service as any)._userAuthorization.authorizeTrySilentFirst = authorizeSpy;
            (service as any)._userDecoder.decode = decodeSpy;
        });

        it("should use the cached token if not expired", () => {
            (service as any)._tokenCache.storeToken(tenant1, resource1, new AccessToken({
                access_token: "initialtoken",
                expires_on: moment().add(1, "hour"),
            } as any));
            service.accessTokenData(tenant1, resource1).subscribe(x => token = x);
            expect(token).not.toBeNull();
            expect(token.access_token).toEqual("initialtoken");
        });

        it("should reload a new token if the token is expiring before the safe margin", () => {
            (service as any)._tokenCache.storeToken(tenant1, resource1, new AccessToken({
                access_token: "initialtoken",
                expires_on: moment().add(1, "minute"),
                refresh_token: "somerefreshtoken",
            } as any));
            service.accessTokenData(tenant1, resource1).subscribe(x => token = x);
            expect(redeemSpy).not.toHaveBeenCalled();
            expect(refreshSpy).toHaveBeenCalledOnce();
            expect(refreshSpy).toHaveBeenCalledWith(resource1, tenant1, "somerefreshtoken");

            expect(token).not.toBeNull();
            expect(token.access_token).toEqual("refreshedToken");
        });

        it("should load a new token if getting a token for another resource", () => {
            (service as any)._tokenCache.storeToken(tenant1, resource1, new AccessToken({
                access_token: "initialtoken",
                expires_on: moment().add(1, "hour"),
            } as any));
            service.accessTokenData(tenant1, "http://other-resource.com").subscribe(x => token = x);
            expect(redeemSpy).toHaveBeenCalled();
            expect(redeemSpy).toHaveBeenCalledWith("http://other-resource.com", tenant1, "somecode");
            expect(refreshSpy).not.toHaveBeenCalled();

            expect(token).not.toBeNull();
            expect(token.access_token).toEqual("newToken");
        });

        it("should load a new token if getting a token for another tenant", () => {
            (service as any)._tokenCache.storeToken(tenant1, resource1, new AccessToken({
                access_token: "initialtoken",
                expires_on: moment().add(1, "hour"),
            } as any));
            service.accessTokenData("tenant-2", resource1).subscribe(x => token = x);
            expect(redeemSpy).toHaveBeenCalled();
            expect(redeemSpy).toHaveBeenCalledWith(resource1, "tenant-2", "somecode");
            expect(refreshSpy).not.toHaveBeenCalled();

            expect(token).not.toBeNull();
            expect(token.access_token).toEqual("newToken");
        });

        describe("when there is no token cached", () => {
            beforeEach(() => {
                service.accessTokenData(tenant1, resource1).subscribe(x => token = x);
            });

            it("should authorize the user", () => {
                expect(authorizeSpy).toHaveBeenCalledOnce();
                expect(decodeSpy).toHaveBeenCalledOnce();
                expect(decodeSpy).toHaveBeenCalledWith("someidtoken");
            });

            it("should save the user inside localStorage", () => {
                expect(localStorage.getItem(Constants.localStorageKey.currentUser)).toEqual(JSON.stringify(sampleUser));
            });

            it("should redeem a new token", () => {
                expect(refreshSpy).not.toHaveBeenCalled();
                expect(redeemSpy).toHaveBeenCalledOnce();
                expect(redeemSpy).toHaveBeenCalledWith(resource1, tenant1, "somecode");
                expect(token.access_token).toEqual("newToken");
            });
        });

    });
});
