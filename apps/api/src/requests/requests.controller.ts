import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiCookieAuth, ApiExtraModels, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ADMIN_ROLE_CODE, MANAGEMENT_ROLE_CODE } from "../auth/auth.constants.js";
import { RequireRoles } from "../auth/auth.decorators.js";
import type { RequestMetadata } from "../auth/auth.types.js";
import { CLIENT_ROLE_CODE } from "../client-portal/client-portal.constants.js";
import type { RequestWithId } from "../request-context/request-with-id.js";
import {
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  ClientDocumentRequestStatusDto,
  CloseRequestOutputDto,
  CreateTimeEntryDto,
  CreateRequestOutputDto,
  CreateRequestTaskDto,
  CreateRequestDto,
  RequestClientDocumentDto,
  RequestQueueQueryDto,
  RequestStatusDto,
  ReviewRequestOutputDto,
  ReviewTimeEntryDto,
  ReturnSharedOutputDto,
  ShareRequestOutputDto,
  SupervisorRequestReviewDto,
  UpdateTimeEntryDto,
  UpdateRequestOutputDto,
  UpdateRequestTaskDto,
  UploadClientDocumentMetadataDto,
} from "./requests.dto.js";
import {
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
} from "./requests.constants.js";
import { RequestsService } from "./requests.service.js";

function metadata(request: RequestWithId): RequestMetadata {
  const userAgent = request.header("user-agent");
  return {
    ...(request.requestId ? { requestId: request.requestId } : {}),
    ...(request.ip ? { ipAddress: request.ip } : {}),
    ...(userAgent ? { userAgent } : {}),
  };
}

@ApiTags("requests")
@ApiCookieAuth()
@ApiExtraModels(
  AddAttachmentMetadataDto,
  AddInternalNoteDto,
  AddRequestCommentDto,
  AssignRequestDto,
  ClientDocumentRequestStatusDto,
  CloseRequestOutputDto,
  CreateTimeEntryDto,
  CreateRequestOutputDto,
  CreateRequestTaskDto,
  CreateRequestDto,
  RequestClientDocumentDto,
  RequestQueueQueryDto,
  RequestStatusDto,
  ReviewRequestOutputDto,
  ReviewTimeEntryDto,
  ReturnSharedOutputDto,
  ShareRequestOutputDto,
  SupervisorRequestReviewDto,
  UpdateTimeEntryDto,
  UpdateRequestOutputDto,
  UpdateRequestTaskDto,
  UploadClientDocumentMetadataDto,
)
@RequireRoles(
  ADMIN_ROLE_CODE,
  MANAGEMENT_ROLE_CODE,
  ACCOUNT_MANAGER_ROLE_CODE,
  SPECIALIST_ROLE_CODE,
  SUPERVISOR_ROLE_CODE,
)
@Controller("requests")
export class RequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: "List service requests within the caller's internal scope" })
  list(@Req() request: RequestWithId) {
    return this.requests.list(request.auth!);
  }

  @Get("queues")
  @ApiOperation({ summary: "List internal request work queues with workload counters" })
  queue(@Query() input: RequestQueueQueryDto, @Req() request: RequestWithId) {
    return this.requests.queue(input, request.auth!);
  }

  @Get("queues/:queue")
  @ApiOperation({ summary: "List a specific internal request work queue" })
  queueByType(
    @Param("queue") queue: NonNullable<RequestQueueQueryDto["queue"]>,
    @Query() input: RequestQueueQueryDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.queue({ ...input, queue }, request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve an internal service request detail view" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.requests.get(id, request.auth!);
  }

  @Post()
  @ApiOperation({ summary: "Create a service request for an active client subscription service" })
  create(@Body() input: CreateRequestDto, @Req() request: RequestWithId) {
    return this.requests.create(input, request.auth!, metadata(request));
  }

  @Patch(":id/assignment")
  @ApiOperation({ summary: "Update request specialist, supervisor, or account manager assignment" })
  assign(@Param("id") id: string, @Body() input: AssignRequestDto, @Req() request: RequestWithId) {
    return this.requests.assign(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/status")
  @ApiOperation({ summary: "Advance a request lifecycle state" })
  changeStatus(
    @Param("id") id: string,
    @Body() input: RequestStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.changeStatus(
      id,
      input.status,
      input.reason,
      request.auth!,
      metadata(request),
    );
  }

  @Post(":id/start")
  @HttpCode(200)
  @ApiOperation({ summary: "Start work on an assigned request" })
  startWork(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.requests.startWork(id, request.auth!, metadata(request));
  }

  @Post(":id/supervisor-review")
  @HttpCode(200)
  @ApiOperation({
    summary: "Approve, return, reject, or escalate a request under supervisor review",
  })
  supervisorReview(
    @Param("id") id: string,
    @Body() input: SupervisorRequestReviewDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.supervisorReview(id, input, request.auth!, metadata(request));
  }

  @Post(":id/comments")
  @HttpCode(200)
  @ApiOperation({ summary: "Add a request comment with explicit client visibility" })
  addComment(
    @Param("id") id: string,
    @Body() input: AddRequestCommentDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addComment(id, input, request.auth!, metadata(request));
  }

  @Post(":id/internal-notes")
  @HttpCode(200)
  @ApiOperation({ summary: "Add an internal-only note to a request" })
  addInternalNote(
    @Param("id") id: string,
    @Body() input: AddInternalNoteDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addInternalNote(id, input, request.auth!, metadata(request));
  }

  @Post(":id/attachments")
  @HttpCode(200)
  @ApiOperation({ summary: "Attach file metadata to a request without uploading file content" })
  addAttachmentMetadata(
    @Param("id") id: string,
    @Body() input: AddAttachmentMetadataDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addAttachmentMetadata(id, input, request.auth!, metadata(request));
  }

  @Post(":id/tasks")
  @HttpCode(200)
  @ApiOperation({ summary: "Create an internal request task or checklist item" })
  createTask(
    @Param("id") id: string,
    @Body() input: CreateRequestTaskDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.createTask(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/tasks/:taskId")
  @ApiOperation({ summary: "Update an internal request task or checklist item" })
  updateTask(
    @Param("id") id: string,
    @Param("taskId") taskId: string,
    @Body() input: UpdateRequestTaskDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.updateTask(id, taskId, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs")
  @HttpCode(200)
  @ApiOperation({ summary: "Create an internal-only request output preparation record" })
  createOutput(
    @Param("id") id: string,
    @Body() input: CreateRequestOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.createOutput(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/outputs/:outputId")
  @ApiOperation({ summary: "Update a draft or returned internal request output" })
  updateOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: UpdateRequestOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.updateOutput(id, outputId, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/submit")
  @HttpCode(200)
  @ApiOperation({ summary: "Submit an internal request output for supervisor review" })
  submitOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Req() request: RequestWithId,
  ) {
    return this.requests.submitOutput(id, outputId, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/review")
  @HttpCode(200)
  @ApiOperation({ summary: "Approve or return an internal request output" })
  reviewOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: ReviewRequestOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.reviewOutput(id, outputId, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/share")
  @HttpCode(200)
  @ApiOperation({ summary: "Share an internally approved output with the client" })
  shareOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: ShareRequestOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.shareOutput(id, outputId, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/close")
  @HttpCode(200)
  @ApiOperation({ summary: "Close a client delivery output after client workflow handling" })
  closeOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: CloseRequestOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.closeOutput(id, outputId, input, request.auth!, metadata(request));
  }

  @Post(":id/document-requests")
  @HttpCode(200)
  @ApiOperation({ summary: "Request a document from the client for this request" })
  requestClientDocument(
    @Param("id") id: string,
    @Body() input: RequestClientDocumentDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.requestClientDocument(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/document-requests/:documentRequestId/status")
  @ApiOperation({ summary: "Cancel or close a client document request" })
  changeDocumentRequestStatus(
    @Param("id") id: string,
    @Param("documentRequestId") documentRequestId: string,
    @Body() input: ClientDocumentRequestStatusDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.changeDocumentRequestStatus(
      id,
      documentRequestId,
      input,
      request.auth!,
      metadata(request),
    );
  }

  @Post(":id/time-entries")
  @HttpCode(200)
  @ApiOperation({ summary: "Create a basic internal time entry for a request" })
  createTimeEntry(
    @Param("id") id: string,
    @Body() input: CreateTimeEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.createTimeEntry(id, input, request.auth!, metadata(request));
  }

  @Patch(":id/time-entries/:timeEntryId")
  @ApiOperation({ summary: "Update a draft or rejected request time entry" })
  updateTimeEntry(
    @Param("id") id: string,
    @Param("timeEntryId") timeEntryId: string,
    @Body() input: UpdateTimeEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.updateTimeEntry(id, timeEntryId, input, request.auth!, metadata(request));
  }

  @Post(":id/time-entries/:timeEntryId/submit")
  @HttpCode(200)
  @ApiOperation({ summary: "Submit a basic request time entry for approval" })
  submitTimeEntry(
    @Param("id") id: string,
    @Param("timeEntryId") timeEntryId: string,
    @Req() request: RequestWithId,
  ) {
    return this.requests.submitTimeEntry(id, timeEntryId, request.auth!, metadata(request));
  }

  @Post(":id/time-entries/:timeEntryId/review")
  @HttpCode(200)
  @ApiOperation({ summary: "Approve or reject a submitted request time entry" })
  reviewTimeEntry(
    @Param("id") id: string,
    @Param("timeEntryId") timeEntryId: string,
    @Body() input: ReviewTimeEntryDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.reviewTimeEntry(id, timeEntryId, input, request.auth!, metadata(request));
  }
}

@ApiTags("client-portal")
@ApiCookieAuth()
@RequireRoles(CLIENT_ROLE_CODE)
@Controller("client-portal/requests")
export class ClientRequestsController {
  constructor(@Inject(RequestsService) private readonly requests: RequestsService) {}

  @Get()
  @ApiOperation({ summary: "List client-safe requests for the current client account" })
  list(@Req() request: RequestWithId) {
    return this.requests.listClientRequests(request.auth!);
  }

  @Get(":id")
  @ApiOperation({ summary: "Retrieve a client-safe request view without internal notes" })
  get(@Param("id") id: string, @Req() request: RequestWithId) {
    return this.requests.getClientRequest(id, request.auth!, metadata(request));
  }

  @Post(":id/comments")
  @HttpCode(200)
  @ApiOperation({ summary: "Add a client-visible comment to a request" })
  addComment(
    @Param("id") id: string,
    @Body() input: AddRequestCommentDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.addClientComment(id, input, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/accept")
  @HttpCode(200)
  @ApiOperation({ summary: "Accept an output explicitly shared with the client" })
  acceptOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Req() request: RequestWithId,
  ) {
    return this.requests.acceptClientOutput(id, outputId, request.auth!, metadata(request));
  }

  @Post(":id/outputs/:outputId/return")
  @HttpCode(200)
  @ApiOperation({ summary: "Return an output explicitly shared with the client" })
  returnOutput(
    @Param("id") id: string,
    @Param("outputId") outputId: string,
    @Body() input: ReturnSharedOutputDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.returnClientOutput(id, outputId, input, request.auth!, metadata(request));
  }

  @Post(":id/document-requests/:documentRequestId/upload")
  @HttpCode(200)
  @ApiOperation({ summary: "Upload requested client document metadata" })
  uploadDocument(
    @Param("id") id: string,
    @Param("documentRequestId") documentRequestId: string,
    @Body() input: UploadClientDocumentMetadataDto,
    @Req() request: RequestWithId,
  ) {
    return this.requests.uploadClientDocument(
      id,
      documentRequestId,
      input,
      request.auth!,
      metadata(request),
    );
  }
}
